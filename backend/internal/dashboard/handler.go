package dashboard

import (
	"fmt"
	"net/http"
	"time"

	"eeg-backend/internal/database"
	"eeg-backend/models"

	"github.com/gin-gonic/gin"
)

type Service struct {
	store database.Store
}

func NewService(store database.Store) *Service {
	return &Service{store: store}
}

func (s *Service) GetSummary(userID string) (*models.DashboardSummary, error) {
	devices, err := s.store.GetDevices()
	if err != nil {
		return nil, err
	}

	sessions, err := s.store.GetSessions(userID)
	if err != nil {
		return nil, err
	}

	var activeDevice *models.Device
	for i := range devices {
		if devices[i].Status == "connected" {
			activeDevice = &devices[i]
			break
		}
	}
	if activeDevice == nil && len(devices) > 0 {
		activeDevice = &devices[0]
	}

	deviceStatus := "Disconnected"
	signalQuality := "No Signal"
	signalQualityVal := 0
	if activeDevice != nil {
		switch activeDevice.Status {
		case "connected":
			deviceStatus = "Connected"
			signalQualityVal = activeDevice.SignalQuality
			if signalQualityVal >= 80 {
				signalQuality = "Good"
			} else if signalQualityVal >= 50 {
				signalQuality = "Fair"
			} else {
				signalQuality = "Poor"
			}
		case "warning":
			deviceStatus = "Warning"
			signalQuality = "Weak"
			signalQualityVal = activeDevice.SignalQuality
		}
	}

	totalSessions := len(sessions)
	latestDurationStr := "0m 00s"
	latestDurationSec := 0
	avgDurationStr := "0m 00s"
	var totalSec int

	for _, ses := range sessions {
		totalSec += ses.Duration
	}

	if totalSessions > 0 {
		latestDurationSec = sessions[0].Duration
		latestDurationStr = formatDuration(latestDurationSec)
		avgDurationStr = formatDuration(totalSec / totalSessions)
	}

	recentLimit := 5
	var recentSessions []models.Session
	if len(sessions) > recentLimit {
		recentSessions = sessions[:recentLimit]
	} else {
		recentSessions = sessions
	}

	lastSync := time.Now()
	battery := 0
	if activeDevice != nil {
		lastSync = activeDevice.LastSeen
		battery = activeDevice.BatteryLevel
	}
	var brainwaveOverview models.BrainwaveFeature
	latestClassification := "Not available yet"

	if totalSessions > 0 {
		features, _ := s.store.GetBrainwaveFeatures(sessions[0].ID)
		if len(features) > 0 {
			brainwaveOverview = features[len(features)-1]
		}
		predictions, _ := s.store.GetMLPredictions(sessions[0].ID)
		if len(predictions) > 0 {
			latestClassification = fmt.Sprintf("%s (%.0f%% conf)", predictions[0].PredictedClass, predictions[0].Confidence*100)
		}
	}

	summary := &models.DashboardSummary{
		DeviceStatus:          deviceStatus,
		SignalQuality:         signalQuality,
		SignalQualityValue:    signalQualityVal,
		TotalSessions:         totalSessions,
		LatestSessionDuration: latestDurationStr,
		LatestDurationSeconds: latestDurationSec,
		AverageDuration:       avgDurationStr,
		LatestClassification:  latestClassification,
		ActiveDevice:          activeDevice,
		RecentSessions:        recentSessions,
		BrainwaveOverview:     brainwaveOverview,
		DeviceHealth: models.DeviceHealthInfo{
			EEGModuleStatus: "Operational",
			ESP32Status:     "Online",
			WiFiStatus:      "Connected (RSSI -58 dBm)",
			BatteryLevel:    battery,
			SignalQuality:   signalQualityVal,
			LastSync:        lastSync,
		},
	}

	return summary, nil
}

func formatDuration(seconds int) string {
	mins := seconds / 60
	secs := seconds % 60
	return fmt.Sprintf("%dm %02ds", mins, secs)
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetSummary(c *gin.Context) {
	userID, _ := c.Get("userID")
	uIDStr := ""
	if userID != nil {
		uIDStr = userID.(string)
	}

	summary, err := h.service.GetSummary(uIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    summary,
	})
}
