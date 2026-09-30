package devices

import (
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

func (s *Service) GetAll() ([]models.Device, error) {
	return s.store.GetDevices()
}

func (s *Service) GetByID(id string) (*models.Device, error) {
	return s.store.GetDeviceByID(id)
}

func (s *Service) Create(req *models.CreateDeviceRequest) (*models.Device, error) {
	now := time.Now()
	firmware := req.FirmwareVersion
	if firmware == "" {
		firmware = "v1.0.0-esp32"
	}

	dev := &models.Device{
		ID:              uuid.New().String(),
		DeviceCode:      req.DeviceCode,
		Name:            req.Name,
		Status:          "connected",
		BatteryLevel:    100,
		SignalQuality:   95,
		FirmwareVersion: firmware,
		LastSeen:        now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if err := s.store.CreateDevice(dev); err != nil {
		return nil, err
	}
	return dev, nil
}

func (s *Service) Update(id string, req *models.UpdateDeviceRequest) (*models.Device, error) {
	dev, err := s.store.GetDeviceByID(id)
	if err != nil {
		return nil, err
	}
	if dev == nil {
		return nil, nil
	}

	if req.Name != "" {
		dev.Name = req.Name
	}
	if req.Status != "" {
		dev.Status = req.Status
	}
	if req.BatteryLevel != nil {
		dev.BatteryLevel = *req.BatteryLevel
	}
	if req.SignalQuality != nil {
		dev.SignalQuality = *req.SignalQuality
	}
	dev.LastSeen = time.Now()

	if err := s.store.UpdateDevice(dev); err != nil {
		return nil, err
	}
	return dev, nil
}

func (s *Service) Delete(id string) error {
	return s.store.DeleteDevice(id)
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetAll(c *gin.Context) {
	devices, err := h.service.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    devices,
	})
}

func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")
	dev, err := h.service.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}
	if dev == nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "Device not found",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    dev,
	})
}

func (h *Handler) Create(c *gin.Context) {
	var req models.CreateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	dev, err := h.service.Create(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Message: "Device registered successfully",
		Data:    dev,
	})
}

func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")
	var req models.UpdateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	dev, err := h.service.Update(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}
	if dev == nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "Device not found",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Device updated successfully",
		Data:    dev,
	})
}

func (h *Handler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Device deleted successfully",
	})
}
