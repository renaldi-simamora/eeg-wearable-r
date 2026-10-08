package eeg

import (
	"errors"
	"log"
	"math"
	"net/http"
	"time"

	"eeg-backend/internal/database"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Service struct {
	store database.Store
	hub   *ws.Hub
}

func NewService(store database.Store, hub *ws.Hub) *Service {
	return &Service{store: store, hub: hub}
}

func (s *Service) GetEEGBySession(sessionID string) (map[string]interface{}, error) {
	samples, err := s.store.GetEEGSamples(sessionID)
	if err != nil {
		return nil, err
	}

	features, err := s.store.GetBrainwaveFeatures(sessionID)
	if err != nil {
		return nil, err
	}

	if samples == nil {
		samples = []models.EEGSample{}
	}
	if features == nil {
		features = []models.BrainwaveFeature{}
	}

	var latestFeature *models.BrainwaveFeature
	if len(features) > 0 {
		latestFeature = &features[len(features)-1]
	}

	return map[string]interface{}{
		"sessionId":     sessionID,
		"samples":       samples,
		"features":      features,
		"latestFeature": latestFeature,
	}, nil
}

func (s *Service) SaveEEGData(req *models.PostEEGDataRequest) error {
	// If hardware node sends a generic active placeholder or empty, bind to currently active session
	if (req.SessionID == "" || req.SessionID == "ses-active-research" || req.SessionID == "active") && s.hub != nil {
		activeID := s.hub.GetActiveSessionID()
		if activeID != "" {
			req.SessionID = activeID
		}
	}

	if req.SessionID == "" {
		log.Println("[EEG VALIDATION] status: INVALID reason: sessionId is required")
		return errors.New("sessionId is required")
	}

	// Validate raw EEG samples
	for i := range req.Samples {
		sm := &req.Samples[i]
		if sm.ID == "" {
			sm.ID = uuid.New().String()
		}
		sm.SessionID = req.SessionID
		if sm.CreatedAt.IsZero() {
			sm.CreatedAt = time.Now()
		}
		if math.IsNaN(sm.RawEEG) || math.IsInf(sm.RawEEG, 0) {
			log.Printf("[EEG VALIDATION] status: INVALID reason: rawEEG NaN or Inf in session %s, clamped to 0", req.SessionID)
			sm.RawEEG = 0.0
		}
	}

	if err := s.store.SaveEEGSamples(req.Samples); err != nil {
		return err
	}

	// Validate brainwave spectral features
	if req.Features != nil {
		f := req.Features
		if math.IsNaN(f.Delta) || math.IsInf(f.Delta, 0) || f.Delta < 0 {
			log.Printf("[EEG VALIDATION] status: INVALID reason: delta invalid (%.2f), clamped to 0", f.Delta)
			f.Delta = 0.0
		}
		if math.IsNaN(f.Theta) || math.IsInf(f.Theta, 0) || f.Theta < 0 {
			log.Printf("[EEG VALIDATION] status: INVALID reason: theta invalid (%.2f), clamped to 0", f.Theta)
			f.Theta = 0.0
		}
		if math.IsNaN(f.Alpha) || math.IsInf(f.Alpha, 0) || f.Alpha < 0 {
			log.Printf("[EEG VALIDATION] status: INVALID reason: alpha invalid (%.2f), clamped to 0", f.Alpha)
			f.Alpha = 0.0
		}
		if math.IsNaN(f.Beta) || math.IsInf(f.Beta, 0) || f.Beta < 0 {
			log.Printf("[EEG VALIDATION] status: INVALID reason: beta invalid (%.2f), clamped to 0", f.Beta)
			f.Beta = 0.0
		}
		if math.IsNaN(f.Gamma) || math.IsInf(f.Gamma, 0) || f.Gamma < 0 {
			log.Printf("[EEG VALIDATION] status: INVALID reason: gamma invalid (%.2f), clamped to 0", f.Gamma)
			f.Gamma = 0.0
		}

		f.ID = uuid.New().String()
		f.SessionID = req.SessionID
		f.CreatedAt = time.Now()
		if f.Timestamp == 0 {
			f.Timestamp = time.Now().UnixMilli()
		}

		log.Printf("[EEG] session_id: %s timestamp: %d delta: %.1f theta: %.1f alpha: %.1f beta: %.1f gamma: %.1f",
			req.SessionID, f.Timestamp, f.Delta, f.Theta, f.Alpha, f.Beta, f.Gamma)
		log.Printf("[EEG VALIDATION] status: VALID session_id: %s", req.SessionID)

		if err := s.store.SaveBrainwaveFeature(f); err != nil {
			return err
		}
	}

	// Broadcast ingested hardware samples to connected WebSocket clients in real-time
	if s.hub != nil && len(req.Samples) > 0 {
		latestSample := req.Samples[len(req.Samples)-1]
		var delta, theta, alpha, beta, gamma float64
		if req.Features != nil {
			delta = req.Features.Delta
			theta = req.Features.Theta
			alpha = req.Features.Alpha
			beta = req.Features.Beta
			gamma = req.Features.Gamma
		}

		s.hub.BroadcastSample(ws.StreamPacket{
			Type:          "eeg_sample",
			SessionID:     req.SessionID,
			Timestamp:     latestSample.Timestamp,
			RawEEG:        latestSample.RawEEG,
			SignalQuality: latestSample.SignalQuality,
			Delta:         delta,
			Theta:         theta,
			Alpha:         alpha,
			Beta:          beta,
			Gamma:         gamma,
			DeviceStatus:  "connected",
			IsSimulation:  false, // Mark as real hardware data
		})
	}

	return nil
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetEEGData(c *gin.Context) {
	sessionID := c.Param("sessionId")
	data, err := h.service.GetEEGBySession(sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    data,
	})
}

func (h *Handler) PostEEGData(c *gin.Context) {
	var req models.PostEEGDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	if err := h.service.SaveEEGData(&req); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "EEG data persisted and broadcasted successfully",
	})
}
