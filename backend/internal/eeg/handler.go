package eeg

import (
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
	for i := range req.Samples {
		if req.Samples[i].ID == "" {
			req.Samples[i].ID = uuid.New().String()
		}
		req.Samples[i].SessionID = req.SessionID
		if req.Samples[i].CreatedAt.IsZero() {
			req.Samples[i].CreatedAt = time.Now()
		}
	}

	if err := s.store.SaveEEGSamples(req.Samples); err != nil {
		return err
	}

	if req.Features != nil {
		req.Features.ID = uuid.New().String()
		req.Features.SessionID = req.SessionID
		req.Features.CreatedAt = time.Now()
		if err := s.store.SaveBrainwaveFeature(req.Features); err != nil {
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
