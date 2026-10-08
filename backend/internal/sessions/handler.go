package sessions

import (
	"errors"
	"net/http"
	"time"

	"eeg-backend/internal/analysis"
	"eeg-backend/internal/database"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Service struct {
	store       database.Store
	hub         *ws.Hub
	analysisSvc *analysis.Service
}

func NewService(store database.Store, hub *ws.Hub, analysisSvc *analysis.Service) *Service {
	return &Service{
		store:       store,
		hub:         hub,
		analysisSvc: analysisSvc,
	}
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

	now := time.Now()
	sigQuality := dev.SignalQuality
	if sigQuality == 0 {
		sigQuality = 92
	}

	ses := &models.Session{
		ID:            uuid.New().String(),
		UserID:        userID,
		DeviceID:      req.DeviceID,
		StartedAt:     now,
		Duration:      0,
		Status:        "running",
		CreatedAt:     now,
		DeviceName:    dev.Name,
		DeviceCode:    dev.DeviceCode,
		SignalQuality: sigQuality,
	}

	if err := s.store.CreateSession(ses); err != nil {
		return nil, err
	}

	if s.hub != nil {
		// All wearable nodes stream telemetry simulation unless overridden by real hardware ingestion packets
		isSim := true
		s.hub.StartAcquisition(ses.ID, isSim)
	}

	return ses, nil
}

func (s *Service) Stop(id string) (*models.Session, error) {
	ses, err := s.store.StopSession(id)
	if err != nil {
		return nil, err
	}

	if s.hub != nil {
		s.hub.StopAcquisition()
	}

	// Trigger automated ML analysis if analysis service is configured
	if s.analysisSvc != nil {
		go func(sessID string) {
			_, _ = s.analysisSvc.ClassifySession(sessID)
		}(id)
	}

	return ses, nil
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

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    sessions,
	})
}

func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")
	ses, err := h.service.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}
	if ses == nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "Session not found",
		})
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
