package eeg

import (
	"math"
	"math/rand"
	"net/http"
	"time"

	"eeg-backend/internal/database"
	"eeg-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Service struct {
	store database.Store
}

func NewService(store database.Store) *Service {
	return &Service{store: store}
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

	// If no samples recorded yet, synthesize realistic scientific baseline for preview
	if len(samples) == 0 {
		now := time.Now().UnixMilli()
		for i := 0; i < 60; i++ {
			t := float64(i) * 0.05
			// Superposition of alpha (10Hz) and theta (6Hz) waves
			val := 20.0*math.Sin(2*math.Pi*10*t) + 12.0*math.Sin(2*math.Pi*6*t) + (rand.Float64()*6 - 3)
			samples = append(samples, models.EEGSample{
				ID:            uuid.New().String(),
				SessionID:     sessionID,
				Timestamp:     now - int64((60-i)*50),
				RawEEG:        math.Round(val*100) / 100,
				SignalQuality: 92,
				CreatedAt:     time.Now(),
			})
		}
	}

	var latestFeature *models.BrainwaveFeature
	if len(features) > 0 {
		latestFeature = &features[len(features)-1]
	} else {
		latestFeature = &models.BrainwaveFeature{
			ID:        uuid.New().String(),
			SessionID: sessionID,
			Timestamp: time.Now().Unix(),
			Delta:     14.2,
			Theta:     18.6,
			Alpha:     42.1,
			Beta:      19.3,
			Gamma:     5.8,
			CreatedAt: time.Now(),
		}
	}

	return map[string]interface{}{
		"sessionId": sessionID,
		"samples":   samples,
		"features":  features,
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
		Message: "EEG samples received successfully",
	})
}
