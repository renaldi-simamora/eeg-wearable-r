package sessions

import (
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"
	"sync"
	"time"

	"eeg-backend/internal/analysis"
	"eeg-backend/internal/database"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Service struct {
	store               database.Store
	hub                 *ws.Hub
	analysisSvc         *analysis.Service
	mu                  sync.RWMutex
	gracefulStopTimeout time.Duration

	// Periodic recovery worker controls
	recoveryRunning bool
	recoveryStopCh  chan struct{}
	recoveryDoneCh  chan struct{}
}

func NewService(store database.Store, hub *ws.Hub, analysisSvc *analysis.Service) *Service {
	return &Service{
		store:               store,
		hub:                 hub,
		analysisSvc:         analysisSvc,
		gracefulStopTimeout: 60 * time.Second, // Default 60 seconds
	}
}

// StartPeriodicRecovery starts the background periodic recovery worker.
// It executes an initial recovery run on startup, then polls every interval (default 30s).
// It is protected against duplicate launches and catches transient database errors without terminating.
func (s *Service) StartPeriodicRecovery(interval time.Duration, cutoffDuration time.Duration) {
	s.mu.Lock()
	if s.recoveryRunning {
		s.mu.Unlock()
		return
	}
	s.recoveryRunning = true
	s.recoveryStopCh = make(chan struct{})
	s.recoveryDoneCh = make(chan struct{})
	s.mu.Unlock()

	if interval <= 0 {
		interval = 30 * time.Second
	}
	if cutoffDuration <= 0 {
		cutoffDuration = 2 * time.Minute
	}

	// 1. Initial recovery on startup
	_, _ = s.RecoverStaleSessions(cutoffDuration)

	// 2. Periodic background worker
	go func() {
		defer close(s.recoveryDoneCh)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-s.recoveryStopCh:
				log.Println("[RECOVERY WORKER] Periodic recovery worker stopped gracefully")
				return
			case <-ticker.C:
				// Transient database error is logged without killing the background worker
				if _, err := s.RecoverStaleSessions(cutoffDuration); err != nil {
					log.Printf("[RECOVERY WORKER] Transient error during periodic recovery run: %v", err)
				}
			}
		}
	}()
}

// StopPeriodicRecovery signals the worker to exit and blocks until the worker goroutine terminates,
// ensuring clean shutdown and zero goroutine leaks.
func (s *Service) StopPeriodicRecovery() {
	s.mu.Lock()
	if !s.recoveryRunning {
		s.mu.Unlock()
		return
	}
	close(s.recoveryStopCh)
	s.recoveryRunning = false
	done := s.recoveryDoneCh
	s.mu.Unlock()

	<-done
}

// IsRecoveryRunning reports whether the periodic recovery worker is actively running
func (s *Service) IsRecoveryRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.recoveryRunning
}

func (s *Service) SetGracefulStopTimeout(d time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if d > 0 {
		s.gracefulStopTimeout = d
	}
}

func (s *Service) GetGracefulStopTimeout() time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.gracefulStopTimeout <= 0 {
		return 60 * time.Second
	}
	return s.gracefulStopTimeout
}

func (s *Service) GetAll(userID string) ([]models.Session, error) {
	return s.store.GetSessions(userID)
}

func (s *Service) GetByID(id string) (*models.Session, error) {
	return s.store.GetSessionByID(id)
}

func (s *Service) Create(userID string, req *models.CreateSessionRequest) (*models.Session, error) {
	// Verify device exists
	dev, err := s.store.GetDeviceByID(req.DeviceID)
	if err != nil {
		return nil, err
	}
	if dev == nil {
		return nil, errors.New("device not found")
	}

	// Validate targetBand against allowed enum: DELTA, THETA, ALPHA, BETA, GAMMA
	targetBand := "ALPHA"
	if req.TargetBand != "" {
		normalized, ok := models.NormalizeTargetBand(req.TargetBand)
		if !ok {
			return nil, fmt.Errorf("invalid target band '%s'; allowed values are DELTA, THETA, ALPHA, BETA, GAMMA", req.TargetBand)
		}
		targetBand = normalized
	}

	participantName := req.ParticipantName
	if participantName == "" {
		participantName = "Anonymous Subject"
	}

	title := req.Title
	if title == "" {
		title = "EEG Recording Session"
	}

	// Determine whether device is a mock / simulation device
	isMockDevice := strings.HasPrefix(dev.ID, "dev-") ||
		strings.Contains(strings.ToLower(dev.Name), "wearable headset") ||
		strings.Contains(strings.ToLower(dev.Name), "mock") ||
		strings.Contains(strings.ToLower(dev.Name), "simulator")

	acqMode := models.AcquisitionModeSimulated
	isSim := true

	if req.AcquisitionMode != "" {
		normalized, valid := models.NormalizeAcquisitionMode(req.AcquisitionMode)
		if !valid {
			return nil, fmt.Errorf("invalid acquisition mode '%s'; allowed values are 'live', 'simulated', 'unknown'", req.AcquisitionMode)
		}
		switch normalized {
		case models.AcquisitionModeLive:
			if isMockDevice {
				return nil, fmt.Errorf("device '%s' is a simulated device and cannot claim 'live' acquisition mode; please use physical hardware (esp32-eeg-gateway-01) or set acquisitionMode to 'simulated'", dev.ID)
			}
			// Gateway connectivity & telemetry heartbeat verification (<= 60s)
			if dev.Status != "connected" || dev.LastSeen.IsZero() || time.Since(dev.LastSeen) > 60*time.Second {
				return nil, fmt.Errorf("device '%s' is not actively online (status: %s); live acquisition requires an active, connected physical hardware gateway", dev.ID, dev.Status)
			}
			acqMode = models.AcquisitionModeLive
			isSim = false
		case models.AcquisitionModeUnknown:
			// Mode unknown is reserved for unverified historical data; it must NEVER run synthetic simulation generator
			acqMode = models.AcquisitionModeUnknown
			isSim = false
		default:
			acqMode = models.AcquisitionModeSimulated
			isSim = true
		}
	} else {
		// Strict Principle: Default acquisition mode is ALWAYS simulated.
		// Zero automatic promotion from default to live.
		acqMode = models.AcquisitionModeSimulated
		isSim = true
	}

	// Ensure no duplicate/orphan running session exists for this device: stop previous running session if any
	if activeSes, _ := s.store.GetActiveSessionByDevice(req.DeviceID); activeSes != nil {
		_, _ = s.store.StopSession(activeSes.ID)
	}

	now := time.Now()
	sigQuality := dev.SignalQuality

	ses := &models.Session{
		ID:              uuid.New().String(),
		UserID:          userID,
		DeviceID:        req.DeviceID,
		ParticipantName: participantName,
		Title:           title,
		Notes:           req.Notes,
		AcquisitionMode: acqMode,
		StartedAt:       now,
		Duration:        0,
		Status:          "running",
		TargetBand:      targetBand,
		CreatedAt:       now,
		DeviceName:      dev.Name,
		DeviceCode:      dev.DeviceCode,
		SignalQuality:   sigQuality,
	}

	if err := s.store.CreateSession(ses); err != nil {
		return nil, err
	}

	if s.hub != nil {
		s.hub.StartAcquisitionWithDeviceAndTarget(ses.ID, isSim, dev.ID, dev.Name, targetBand)
	}

	return ses, nil
}

func (s *Service) Update(id string, req *models.UpdateSessionRequest) (*models.Session, error) {
	ses, err := s.store.GetSessionByID(id)
	if err != nil {
		return nil, err
	}
	if ses == nil {
		return nil, errors.New("session not found")
	}

	if req.ParticipantName != "" {
		ses.ParticipantName = req.ParticipantName
	}
	if req.Title != "" {
		ses.Title = req.Title
	}
	if req.Notes != "" {
		ses.Notes = req.Notes
	}

	if err := s.store.UpdateSession(ses); err != nil {
		return nil, err
	}
	return ses, nil
}

func (s *Service) GetReport(sessionID string) (*models.SessionAnalysisReport, error) {
	ses, err := s.store.GetSessionByID(sessionID)
	if err != nil {
		return nil, err
	}
	if ses == nil {
		return nil, errors.New("session not found")
	}

	samples, err := s.store.GetEEGSamples(sessionID)
	if err != nil {
		samples = []models.EEGSample{}
	}

	features, err := s.store.GetBrainwaveFeatures(sessionID)
	if err != nil {
		features = []models.BrainwaveFeature{}
	}

	// 1. Calculate signal statistics from actual recorded samples
	stats := models.SignalStatistics{}
	if len(samples) > 0 {
		var sum, sumSq float64
		minVal := samples[0].RawEEG
		maxVal := samples[0].RawEEG

		for _, sm := range samples {
			val := sm.RawEEG
			sum += val
			sumSq += val * val
			if val < minVal {
				minVal = val
			}
			if val > maxVal {
				maxVal = val
			}
		}

		n := float64(len(samples))
		mean := sum / n
		variance := (sumSq / n) - (mean * mean)
		if variance < 0 {
			variance = 0
		}

		meanVal := math.Round(mean*100) / 100
		minV := math.Round(minVal*100) / 100
		maxV := math.Round(maxVal*100) / 100
		stdV := math.Round(math.Sqrt(variance)*100) / 100

		// Canonical neutral signal statistics
		stats.Mean = meanVal
		stats.Min = minV
		stats.Max = maxV
		stats.StdDev = stdV
		stats.Unit = "µV (estimated)"

		// Backwards-compatibility aliases
		stats.MeanMicrovolts = meanVal
		stats.MinMicrovolts = minV
		stats.MaxMicrovolts = maxV
	} else {
		stats.Unit = "N/A"
	}

	// 2. Calculate average band power and dominant band from actual features
	avgFeature := models.BrainwaveFeature{
		SessionID: sessionID,
	}
	dominantBand := "ALPHA"
	dominantPct := 0.0

	if len(features) > 0 {
		var sumD, sumT, sumA, sumB, sumG float64
		for _, f := range features {
			sumD += f.Delta
			sumT += f.Theta
			sumA += f.Alpha
			sumB += f.Beta
			sumG += f.Gamma
		}
		nf := float64(len(features))
		avgFeature.Delta = math.Round((sumD/nf)*100) / 100
		avgFeature.Theta = math.Round((sumT/nf)*100) / 100
		avgFeature.Alpha = math.Round((sumA/nf)*100) / 100
		avgFeature.Beta = math.Round((sumB/nf)*100) / 100
		avgFeature.Gamma = math.Round((sumG/nf)*100) / 100

		// Identify highest average relative band power
		dominantPct = avgFeature.Alpha
		dominantBand = "ALPHA"

		if avgFeature.Beta > dominantPct {
			dominantPct = avgFeature.Beta
			dominantBand = "BETA"
		}
		if avgFeature.Theta > dominantPct {
			dominantPct = avgFeature.Theta
			dominantBand = "THETA"
		}
		if avgFeature.Delta > dominantPct {
			dominantPct = avgFeature.Delta
			dominantBand = "DELTA"
		}
		if avgFeature.Gamma > dominantPct {
			dominantPct = avgFeature.Gamma
			dominantBand = "GAMMA"
		}
	}

	// 3. Signal Quality Label (NeuroSky ThinkGear byte 0x02: 0=Good Contact, 1-199=Poor Signal / Noise Level, 200=Lead-off)
	sigQualityLabel := "Not Available"
	effectiveSQ := ses.SignalQuality
	if effectiveSQ == nil && len(samples) > 0 {
		sqVal := samples[len(samples)-1].SignalQuality
		effectiveSQ = &sqVal
	}
	if effectiveSQ != nil {
		sq := *effectiveSQ
		if sq >= 200 {
			sigQualityLabel = "Lead-off"
		} else if sq > 0 {
			sigQualityLabel = fmt.Sprintf("Poor Signal / Noise Level (%d/200)", sq)
		} else {
			sigQualityLabel = "Good Contact"
		}
	}

	// 4. Formatted duration
	min := ses.Duration / 60
	sec := ses.Duration % 60
	formattedDuration := fmt.Sprintf("%dm %02ds", min, sec)

	// 5. ML predictions (only return if actual prediction recorded from research model)
	mlStatus := "unavailable"
	var latestPred *models.MLPrediction
	mlNote := "ML prediction unavailable: Machine Learning classification service is offline or model not connected. Research target: Class 0 (Resting) vs Class 1 (Math Task). Dominant band is based strictly on measured power spectrum."

	preds, predErr := s.store.GetMLPredictions(sessionID)
	if predErr == nil && len(preds) > 0 {
		latestPred = &preds[len(preds)-1]
		mlStatus = "available"
		mlNote = fmt.Sprintf("Academic classification by %s (%s). Research condition classification: Class 0 (Resting) vs Class 1 (Math Task). Does not constitute medical diagnosis.", latestPred.ModelName, latestPred.ModelVersion)
	}

	report := &models.SessionAnalysisReport{
		SessionID:          ses.ID,
		ParticipantName:    ses.ParticipantName,
		Title:              ses.Title,
		Notes:              ses.Notes,
		AcquisitionMode:    ses.AcquisitionMode,
		Status:             ses.Status,
		TargetBand:         ses.TargetBand,
		StartedAt:          ses.StartedAt,
		EndedAt:            ses.EndedAt,
		DurationSeconds:    ses.Duration,
		FormattedDuration:  formattedDuration,
		DeviceID:           ses.DeviceID,
		DeviceName:         ses.DeviceName,
		DeviceCode:         ses.DeviceCode,
		SignalQuality:      effectiveSQ,
		SignalQualityLabel: sigQualityLabel,
		SamplingRateHz:     512,
		SamplingRateStatus: "nominal_unverified",
		ChannelCount:       1,
		LeadLocation:       "FP1 (Pre-frontal dry electrode)",
		TotalSamples:       len(samples),
		SignalStats:        stats,
		AverageBandPower:   avgFeature,
		DominantBand:       dominantBand,
		DominantBandPct:    dominantPct,
		MLStatus:           mlStatus,
		MLPrediction:       latestPred,
		MLNote:             mlNote,
		Samples:            samples,
		Features:           features,
	}

	return report, nil
}

func (s *Service) Stop(id string) (*models.Session, error) {
	ses, err := s.store.GetSessionByID(id)
	if err != nil {
		return nil, err
	}
	if ses == nil {
		return nil, fmt.Errorf("session not found")
	}

	// Idempotent: If already completed, return as-is
	if ses.Status == "completed" {
		return ses, nil
	}

	// Requirement 2: Repeated Stop when status is already stop_requested.
	// Must remain in stop_requested and be strictly idempotent!
	// Do NOT force-stop to completed. Do NOT launch a second watchdog.
	if ses.Status == "stop_requested" {
		return ses, nil
	}

	// Check if this is a live hardware session with an online device
	isLiveHardware := (ses.AcquisitionMode == models.AcquisitionModeLive || ses.DeviceID == "esp32-eeg-gateway-01")
	var isDeviceOnline bool
	if ses.DeviceID != "" {
		dev, devErr := s.store.GetDeviceByID(ses.DeviceID)
		if devErr == nil && dev != nil && dev.Status == "connected" && time.Since(dev.LastSeen) <= 60*time.Second {
			isDeviceOnline = true
		}
	}

	// If hardware session AND device is online: initiate graceful stop handshake
	if isLiveHardware && isDeviceOnline {
		reqSes, reqErr := s.store.RequestStopSession(id)
		if reqErr != nil {
			return nil, reqErr
		}

		if s.hub != nil {
			s.hub.BroadcastState("STOPPING", id)
		}

		timeout := s.GetGracefulStopTimeout()

		// Watchdog timer: if ESP32 does not finish session in time
		// (e.g. WiFi dropped during stop handshake), finalize session automatically.
		go func(sessID string, store database.Store, hub *ws.Hub, analysisSvc *analysis.Service, timeoutDuration time.Duration) {
			time.Sleep(timeoutDuration)

			// Check current session state first
			current, err := store.GetSessionByID(sessID)
			if err != nil || current == nil || current.Status != "stop_requested" {
				return // Sesi sudah completed atau tidak ditemukan, no-op!
			}

			// Atomic finalization with durable ML job in single transaction
			_, job, transitioned, finalizeErr := store.FinalizeSessionWithJob(sessID)
			if finalizeErr != nil {
				log.Printf("[SESSION WATCHDOG ERROR] FinalizeSessionWithJob failed for session %s: %v", sessID, finalizeErr)
			} else if transitioned {
				log.Printf("[SESSION WATCHDOG] Session %s in stop_requested timed out (%v); auto-finalized to completed with ML job", sessID, timeoutDuration)
				if hub != nil {
					hub.StopAcquisition()
				}
				if analysisSvc != nil && job != nil {
					analysisSvc.NotifyWorker()
				}
			}
		}(id, s.store, s.hub, s.analysisSvc, timeout)

		return reqSes, nil
	}

	// Device offline or simulated session: finalize immediately with durable ML job in single transaction
	finalSes, job, transitioned, stopErr := s.store.FinalizeSessionWithJob(id)
	if stopErr != nil {
		log.Printf("[SESSION STOP ERROR] FinalizeSessionWithJob failed for session %s: %v", id, stopErr)
		return nil, stopErr
	}

	if transitioned {
		if s.hub != nil {
			s.hub.StopAcquisition()
		}
		if s.analysisSvc != nil && job != nil {
			s.analysisSvc.NotifyWorker()
		}
	}

	return finalSes, nil
}

// RecoverStaleSessions recovers and finalizes any orphaned stop_requested sessions on startup
func (s *Service) RecoverStaleSessions(cutoffDuration time.Duration) ([]models.Session, error) {
	if cutoffDuration <= 0 {
		cutoffDuration = 2 * time.Minute
	}

	recovered, err := s.store.RecoverStaleStopRequestedSessions(cutoffDuration)
	if err != nil {
		log.Printf("[STARTUP RECOVERY] Error querying stale stop_requested sessions: %v", err)
		return nil, err
	}

	if len(recovered) > 0 {
		log.Printf("[STARTUP RECOVERY] Successfully recovered %d stale stop_requested sessions (auto-finalized to completed with ML jobs)", len(recovered))
		if s.analysisSvc != nil {
			s.analysisSvc.NotifyWorker()
		}
	}

	return recovered, nil
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetAll(c *gin.Context) {
	userID, _ := c.Get("userID")
	uIDStr := ""
	if userID != nil {
		uIDStr = userID.(string)
	}

	sessions, err := h.service.GetAll(uIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	if sessions == nil {
		sessions = []models.Session{}
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    sessions,
	})
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

	ses, err := h.service.GetByID(sessionID)
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

func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")
	ses, ok := h.authorizeSessionAccess(c, id)
	if !ok {
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    ses,
	})
}

func (h *Handler) Create(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.APIResponse{
			Success: false,
			Error:   "Unauthorized",
		})
		return
	}

	var req models.CreateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	ses, err := h.service.Create(userID.(string), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Session created successfully",
		Data:    ses,
	})
}

func (h *Handler) Stop(c *gin.Context) {
	id := c.Param("id")
	_, ok := h.authorizeSessionAccess(c, id)
	if !ok {
		return
	}

	ses, err := h.service.Stop(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Session stopped successfully",
		Data:    ses,
	})
}

func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")
	_, ok := h.authorizeSessionAccess(c, id)
	if !ok {
		return
	}

	var req models.UpdateSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	ses, err := h.service.Update(id, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Session updated successfully",
		Data:    ses,
	})
}

func (h *Handler) GetReport(c *gin.Context) {
	id := c.Param("id")
	_, ok := h.authorizeSessionAccess(c, id)
	if !ok {
		return
	}

	report, err := h.service.GetReport(id)
	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    report,
	})
}
