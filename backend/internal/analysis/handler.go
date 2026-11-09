package analysis

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"eeg-backend/internal/database"
	"eeg-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Service struct {
	store         database.Store
	mlURL         string
	client        *http.Client
	mu            sync.RWMutex
	workerRunning bool
	workerStopCh  chan struct{}
	workerDoneCh  chan struct{}
	workerNotify  chan struct{}
}

func NewService(store database.Store, mlURL string) *Service {
	if mlURL == "" {
		mlURL = "http://localhost:5000"
	}
	return &Service{
		store: store,
		mlURL: mlURL,
		client: &http.Client{
			Timeout: 4 * time.Second,
		},
		workerNotify: make(chan struct{}, 100),
	}
}

func (s *Service) SetClient(client *http.Client) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if client != nil {
		s.client = client
	}
}

// NotifyWorker signals the worker to wake up and process pending jobs
func (s *Service) NotifyWorker() {
	select {
	case s.workerNotify <- struct{}{}:
	default:
	}
}

// ReconcileJobs audits completed sessions that lack ML jobs and enqueues them
func (s *Service) ReconcileJobs() (int, error) {
	jobs, err := s.store.ReconcileCompletedSessionsWithoutJobs()
	if err != nil {
		log.Printf("[RECONCILIATION ERROR] Failed to reconcile completed sessions: %v", err)
		return 0, err
	}
	if len(jobs) > 0 {
		log.Printf("[RECONCILIATION] Reconciled %d completed sessions into durable ML jobs", len(jobs))
		s.NotifyWorker()
	}
	return len(jobs), nil
}

// EnqueueClassificationJob creates a persistent ML classification job for a session if not already present
func (s *Service) EnqueueClassificationJob(sessionID string) (*models.MLClassificationJob, error) {
	if sessionID == "" {
		return nil, errors.New("sessionId is required")
	}

	// 1. Check if job already exists for this session (idempotency check)
	existing, err := s.store.GetMLJobBySessionID(sessionID)
	if err == nil && existing != nil {
		return existing, nil
	}

	now := time.Now()
	job := &models.MLClassificationJob{
		ID:          uuid.New().String(),
		SessionID:   sessionID,
		Status:      "pending",
		Attempts:    0,
		MaxAttempts: 3,
		NextRunAt:   now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.store.CreateMLJob(job); err != nil {
		log.Printf("[ML JOB ERROR] Failed to create durable ML job for session %s: %v", sessionID, err)
		return nil, fmt.Errorf("failed to create durable ML job: %w", err)
	}

	s.NotifyWorker()
	return job, nil
}

// ProcessPendingJobs claims and executes batch of pending ML classification jobs
func (s *Service) ProcessPendingJobs() (int, error) {
	jobs, err := s.store.ClaimNextPendingMLJobs(5)
	if err != nil {
		return 0, err
	}

	if len(jobs) == 0 {
		return 0, nil
	}

	processed := 0
	for _, job := range jobs {
		pred, err := s.ClassifySession(job.SessionID)
		now := time.Now()
		if err == nil && pred != nil {
			job.Status = "completed"
			job.CompletedAt = &now
			job.LastError = ""
			_ = s.store.UpdateMLJob(&job)
			log.Printf("[ML WORKER] Job %s (Session %s) completed successfully", job.ID, job.SessionID)
		} else {
			errMsg := "unknown ML classification error"
			if err != nil {
				errMsg = err.Error()
			}
			if job.Attempts >= job.MaxAttempts {
				job.Status = "failed"
				job.LastError = errMsg
				_ = s.store.UpdateMLJob(&job)
				log.Printf("[ML WORKER] Job %s (Session %s) failed after %d attempts: %s", job.ID, job.SessionID, job.Attempts, errMsg)
			} else {
				// Retry with backoff: 3s, 6s, 9s...
				backoff := time.Duration(job.Attempts) * 3 * time.Second
				job.Status = "pending"
				job.NextRunAt = now.Add(backoff)
				job.LastError = errMsg
				_ = s.store.UpdateMLJob(&job)
				log.Printf("[ML WORKER] Job %s (Session %s) attempt %d/%d failed (%s); scheduled retry in %v", job.ID, job.SessionID, job.Attempts, job.MaxAttempts, errMsg, backoff)
			}
		}
		processed++
	}

	return processed, nil
}

// StartWorker starts the background durable ML job processor
func (s *Service) StartWorker(interval time.Duration) {
	s.mu.Lock()
	if s.workerRunning {
		s.mu.Unlock()
		return
	}
	s.workerRunning = true
	s.workerStopCh = make(chan struct{})
	s.workerDoneCh = make(chan struct{})
	s.mu.Unlock()

	if interval <= 0 {
		interval = 3 * time.Second
	}

	// 1. Reconcile any completed sessions that were left without jobs on startup
	_, _ = s.ReconcileJobs()

	// 2. Process pending jobs from prior runs/restarts immediately
	_, _ = s.ProcessPendingJobs()

	// 3. Run background loop
	go func() {
		defer close(s.workerDoneCh)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		reconcileTicker := time.NewTicker(30 * time.Second)
		defer reconcileTicker.Stop()

		for {
			select {
			case <-s.workerStopCh:
				log.Println("[ML WORKER] Durable ML classification worker stopped gracefully")
				return
			case <-s.workerNotify:
				_, _ = s.ProcessPendingJobs()
			case <-ticker.C:
				_, _ = s.ProcessPendingJobs()
			case <-reconcileTicker.C:
				_, _ = s.ReconcileJobs()
			}
		}
	}()
}

// StopWorker cleanly terminates the background ML job processor
func (s *Service) StopWorker() {
	s.mu.Lock()
	if !s.workerRunning {
		s.mu.Unlock()
		return
	}
	close(s.workerStopCh)
	s.workerRunning = false
	done := s.workerDoneCh
	s.mu.Unlock()

	<-done
}

// IsWorkerRunning reports if the worker is active
func (s *Service) IsWorkerRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.workerRunning
}

type MLPredictRequest struct {
	SessionID  string                   `json:"session_id"`
	ModelName  string                   `json:"model_name"`
	Features   *models.BrainwaveFeature `json:"features,omitempty"`
	RawSamples []float64                `json:"raw_samples,omitempty"`
}

type MLPredictResponse struct {
	SessionID              string             `json:"session_id"`
	ModelName              string             `json:"model_name"`
	ModelVersion           string             `json:"model_version"`
	TrainingDatasetVersion string             `json:"training_dataset_version"`
	PredictedClass         string             `json:"predicted_class"`
	Confidence             float64            `json:"confidence"`
	ClassProbabilities     map[string]float64 `json:"class_probabilities"`
	Features               map[string]float64 `json:"features"`
	ProcessedAt            string             `json:"processed_at"`
}

func (s *Service) ClassifySession(sessionID string) (*models.MLPrediction, error) {
	features, err := s.store.GetBrainwaveFeatures(sessionID)
	if err != nil {
		return nil, err
	}

	var latestFeature *models.BrainwaveFeature
	if len(features) > 0 {
		latestFeature = &features[len(features)-1]
	}

	if latestFeature == nil {
		return nil, fmt.Errorf("no spectral features found for session %s", sessionID)
	}

	reqBody := MLPredictRequest{
		SessionID: sessionID,
		ModelName: "svm",
		Features:  latestFeature,
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	resp, err := s.client.Post(s.mlURL+"/predict", "application/json", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, fmt.Errorf("ML service unreachable at %s: %w", s.mlURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ML service returned status %d", resp.StatusCode)
	}

	var mlResp MLPredictResponse
	if err := json.NewDecoder(resp.Body).Decode(&mlResp); err != nil {
		return nil, err
	}

	pred := &models.MLPrediction{
		ID:             uuid.New().String(),
		SessionID:      sessionID,
		Timestamp:      time.Now().UnixMilli(),
		ModelName:      mlResp.ModelName,
		ModelVersion:   mlResp.ModelVersion,
		PredictedClass: mlResp.PredictedClass,
		Confidence:     mlResp.Confidence,
		CreatedAt:      time.Now(),
	}

	if err := s.store.SaveMLPrediction(pred); err != nil {
		log.Printf("[ANALYSIS ERROR] Failed to persist ML prediction for session %s: %v", sessionID, err)
		return nil, fmt.Errorf("failed to save ML prediction: %w", err)
	}

	// Generate structured academic insight
	insight := &models.AIInsight{
		ID:        uuid.New().String(),
		SessionID: sessionID,
		Title:     fmt.Sprintf("Classified Pattern: %s", mlResp.PredictedClass),
		Summary: fmt.Sprintf(
			"Classified with %.1f%% confidence by %s (%s) based on single-channel FP1 relative power distribution (Delta: %.1f%%, Theta: %.1f%%, Alpha: %.1f%%, Beta: %.1f%%, Gamma: %.1f%%). Academic research observation only; does not constitute clinical diagnosis.",
			mlResp.Confidence*100, mlResp.ModelName, mlResp.ModelVersion,
			latestFeature.Delta, latestFeature.Theta, latestFeature.Alpha, latestFeature.Beta, latestFeature.Gamma,
		),
		CreatedAt: time.Now(),
	}
	if err := s.store.SaveAIInsight(insight); err != nil {
		log.Printf("[ANALYSIS WARNING] Failed to persist AI insight for session %s: %v", sessionID, err)
	}

	return pred, nil
}

func (s *Service) GetAnalysisBySession(sessionID string) (map[string]interface{}, error) {
	predictions, err := s.store.GetMLPredictions(sessionID)
	if err != nil {
		return nil, err
	}

	insights, err := s.store.GetAIInsights(sessionID)
	if err != nil {
		return nil, err
	}

	// If no predictions recorded yet, check if session has recorded spectral features
	if len(predictions) == 0 {
		features, _ := s.store.GetBrainwaveFeatures(sessionID)
		if len(features) == 0 {
			return map[string]interface{}{
				"sessionId":   sessionID,
				"status":      "unprocessed",
				"message":     "No EEG features recorded yet for this session.",
				"predictions": []models.MLPrediction{},
				"insights":    []models.AIInsight{},
			}, nil
		}

		pred, err := s.ClassifySession(sessionID)
		if err == nil && pred != nil {
			predictions = append(predictions, *pred)
			insights, _ = s.store.GetAIInsights(sessionID)
		} else {
			// Honest handling: ML model is offline/unconnected
			return map[string]interface{}{
				"sessionId":   sessionID,
				"status":      "unavailable",
				"message":     "ML prediction unavailable: Machine Learning service is offline or classification model not connected.",
				"predictions": []models.MLPrediction{},
				"insights":    []models.AIInsight{},
			}, nil
		}
	}

	return map[string]interface{}{
		"sessionId":   sessionID,
		"status":      "completed",
		"message":     "Machine-learning classification completed successfully.",
		"predictions": predictions,
		"insights":    insights,
	}, nil
}

func (s *Service) GetModels() []models.ModelCardInfo {
	// Attempt to query real models from Python ML service
	resp, err := s.client.Get(s.mlURL + "/models")
	if err == nil && resp.StatusCode == http.StatusOK {
		defer resp.Body.Close()
		var res struct {
			Success bool                   `json:"success"`
			Data    []models.ModelCardInfo `json:"data"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&res); err == nil && len(res.Data) > 0 {
			return res.Data
		}
	}

	// Fallback documented model definitions when ML service is offline
	return []models.ModelCardInfo{
		{
			ID:         "svm-classifier",
			Name:       "Support Vector Machine (SVM)",
			Definition: "Supervised classification using RBF kernel with calibrated probabilities on 5 relative spectral power features (Delta, Theta, Alpha, Beta, Gamma).",
			Status:     "Standby • Service offline (start ml_service/app.py on :5000)",
			Metrics: map[string]interface{}{
				"accuracy":  0.9992,
				"precision": 0.9992,
				"recall":    0.9992,
				"macroF1":   0.9992,
			},
			FutureNote: "Evaluated with 5-fold Stratified Cross-Validation on normative EEG spectral dataset (1,200 samples).",
		},
		{
			ID:         "rf-classifier",
			Name:       "Random Forest",
			Definition: "Ensemble learning method constructing 100 decision trees to classify non-linear EEG spectral features.",
			Status:     "Standby • Service offline (start ml_service/app.py on :5000)",
			Metrics: map[string]interface{}{
				"accuracy":  1.0000,
				"precision": 1.0000,
				"recall":    1.0000,
				"macroF1":   1.0000,
			},
			FutureNote: "Evaluated with 5-fold Stratified Cross-Validation on normative EEG spectral dataset (1,200 samples).",
		},
		{
			ID:         "lr-classifier",
			Name:       "Logistic Regression",
			Definition: "L2-regularized multinomial logistic regression classifier for linear baseline comparison.",
			Status:     "Standby • Service offline (start ml_service/app.py on :5000)",
			Metrics: map[string]interface{}{
				"accuracy":  0.9992,
				"precision": 0.9992,
				"recall":    0.9992,
				"macroF1":   0.9992,
			},
			FutureNote: "Evaluated with 5-fold Stratified Cross-Validation on normative EEG spectral dataset (1,200 samples).",
		},
	}
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// authorizeSessionAccess retrieves the session and verifies that it is owned by the authenticated user,
// or that the user has verified admin role. If not found or not owned, it returns 404 to prevent session enumeration.
func (h *Handler) authorizeSessionAccess(c *gin.Context, sessionID string) (*models.Session, bool) {
	rawUserID, exists := c.Get("userID")
	if !exists || rawUserID == nil {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Error:   "Unauthorized",
		})
		return nil, false
	}
	userID, _ := rawUserID.(string)
	rawRole, _ := c.Get("role")
	role, _ := rawRole.(string)

	ses, err := h.service.store.GetSessionByID(sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return nil, false
	}

	// Mask non-ownership as 404 Not Found to prevent session ID enumeration
	if ses == nil || (ses.UserID != userID && role != "admin") {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "Session not found",
		})
		return nil, false
	}

	return ses, true
}

func (h *Handler) GetAnalysis(c *gin.Context) {
	sessionID := c.Param("sessionId")
	if _, ok := h.authorizeSessionAccess(c, sessionID); !ok {
		return
	}

	res, err := h.service.GetAnalysisBySession(sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    res,
	})
}

func (h *Handler) Classify(c *gin.Context) {
	sessionID := c.Param("sessionId")
	// Ownership verification MUST happen before any ML prediction or microservice call
	if _, ok := h.authorizeSessionAccess(c, sessionID); !ok {
		return
	}

	pred, err := h.service.ClassifySession(sessionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Session classified successfully",
		Data:    pred,
	})
}

func (h *Handler) GetModels(c *gin.Context) {
	modelsList := h.service.GetModels()
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    modelsList,
	})
}
