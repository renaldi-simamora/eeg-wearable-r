package eeg

import (
	"errors"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"strings"
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

func generatePhysiologicalEEGData(sessionID, devName, devCode string) ([]models.EEGSample, models.BrainwaveFeature) {
	str := strings.ToLower(devName + " " + devCode + " " + sessionID)
	band := "alpha"
	cycles := 17.0
	var feature models.BrainwaveFeature

	if strings.Contains(str, "delta") || strings.Contains(str, "004") {
		band = "delta"
		cycles = 3.2
		feature = models.BrainwaveFeature{
			Delta: 52.0, Theta: 20.0, Alpha: 13.0, Beta: 9.5, Gamma: 5.5,
		}
	} else if strings.Contains(str, "theta") || strings.Contains(str, "005") {
		band = "theta"
		cycles = 7.5
		feature = models.BrainwaveFeature{
			Delta: 17.0, Theta: 47.0, Alpha: 17.5, Beta: 12.0, Gamma: 6.5,
		}
	} else if strings.Contains(str, "gamma") || strings.Contains(str, "003") {
		band = "gamma"
		cycles = 48.0
		feature = models.BrainwaveFeature{
			Delta: 8.0, Theta: 11.0, Alpha: 15.0, Beta: 26.0, Gamma: 40.0,
		}
	} else if strings.Contains(str, "beta") || strings.Contains(str, "002") {
		band = "beta"
		cycles = 32.0
		feature = models.BrainwaveFeature{
			Delta: 9.5, Theta: 13.5, Alpha: 19.0, Beta: 45.0, Gamma: 13.0,
		}
	} else {
		// Alpha default
		band = "alpha"
		cycles = 17.0
		feature = models.BrainwaveFeature{
			Delta: 10.5, Theta: 15.0, Alpha: 48.0, Beta: 18.0, Gamma: 8.5,
		}
	}

	now := time.Now()
	feature.ID = uuid.New().String()
	feature.SessionID = sessionID
	feature.Timestamp = now.UnixMilli()
	feature.CreatedAt = now

	samples := make([]models.EEGSample, 120)
	for i := 0; i < 120; i++ {
		phase := (float64(i) * 2.0 * math.Pi * cycles) / 120.0
		var val float64
		switch band {
		case "delta":
			val = 36.0*math.Sin(phase) + 6.0*math.Sin(phase*0.45+0.8)
		case "theta":
			val = 24.0*math.Sin(phase) + 5.0*math.Sin(phase*0.5+1.2)
		case "gamma":
			val = 6.5*math.Sin(phase) + 2.5*math.Sin(phase*1.35+0.4)
		case "beta":
			val = 12.0*math.Sin(phase) + 3.5*math.Sin(phase*0.7+0.9) + 2.0*math.Sin(phase*1.4+2.1)
		default: // alpha
			env := 18.0 + 5.0*math.Cos((float64(i)*2.0*math.Pi*1.5)/120.0)
			val = env*math.Sin(phase) + 2.0*math.Sin(phase*2.0+0.4)
		}
		val += (rand.Float64()*2.0 - 1.0) * 0.8

		samples[i] = models.EEGSample{
			ID:            uuid.New().String(),
			SessionID:     sessionID,
			Timestamp:     now.UnixMilli() - int64((120-i)*20),
			RawEEG:        math.Round(val*100) / 100,
			SignalQuality: 94,
			CreatedAt:     now,
		}
	}
	return samples, feature
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

	if len(req.Samples) == 0 {
		return errors.New("samples are required")
	}

	// Ensure session exists to uphold relational integrity (e.g. initial hardware stream)
	existingSession, err := s.store.GetSessionByID(req.SessionID)
	if err != nil || existingSession == nil {
		newSession := models.Session{
			ID:              req.SessionID,
			UserID:          "user-demo-01",
			DeviceID:        "dev-001",
			AcquisitionMode: models.AcquisitionModeSimulated,
			StartedAt:       time.Now(),
			Status:          "running",
			TargetBand:      "ALPHA",
			CreatedAt:       time.Now(),
		}
		_ = s.store.CreateSession(&newSession)
	}

	// 1. Validate raw EEG samples
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

	// 2. Persist samples to database FIRST before updating any device stream status
	if err := s.store.SaveEEGSamples(req.Samples); err != nil {
		return err
	}

	// 3. Validate and persist brainwave spectral features
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

		if err := s.store.SaveBrainwaveFeature(f); err != nil {
			return err
		}
	}

	// 4. Update simulated device heartbeat (Only AFTER successful DB save)
	// Academic Integrity Rule: Simulator ingestion MUST NOT update LastEEGStreamAt of physical hardware devices
	targetDevID := "dev-001"
	if existingSession != nil && existingSession.DeviceID != "" {
		targetDevID = existingSession.DeviceID
	}
	if targetDevID != "esp32-eeg-gateway-01" {
		if dev, devErr := s.store.GetDeviceByID(targetDevID); devErr == nil && dev != nil {
			dev.Status = "connected"
			dev.LastSeen = time.Now()
			_ = s.store.UpdateDevice(dev)
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

// StartDeviceSession registers a session initiated by an IoT device (ESP32)
func (s *Service) StartDeviceSession(req *models.DeviceSessionStartRequest) (*models.Session, error) {
	if req.SessionID == "" {
		return nil, errors.New("session_id is required")
	}
	if req.DeviceID == "" {
		req.DeviceID = "esp32-eeg-gateway-01"
	}

	now := time.Now()

	// 1. Ensure device exists and update its status
	dev, err := s.store.GetDeviceByID(req.DeviceID)
	if err != nil || dev == nil {
		newDev := models.Device{
			ID:              req.DeviceID,
			DeviceCode:      req.DeviceID,
			Name:            "ESP32 TGAM1 Gateway",
			Status:          "connected",
			BatteryLevel:    100,
			SignalQuality:   nil,
			FirmwareVersion: "v1.0.0",
			LastSeen:        now,
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		_ = s.store.CreateDevice(&newDev)
		dev = &newDev
	} else {
		dev.Status = "connected"
		dev.LastSeen = now
		_ = s.store.UpdateDevice(dev)
	}

	// 2. Check if session already exists (idempotency)
	existing, _ := s.store.GetSessionByID(req.SessionID)
	if existing != nil {
		if s.hub != nil {
			s.hub.StartAcquisitionWithDeviceAndTarget(existing.ID, false, existing.DeviceID, dev.Name, existing.TargetBand)
		}
		return existing, nil
	}

	targetBand := "ALPHA"
	if req.TargetBand != "" {
		if norm, ok := models.NormalizeTargetBand(req.TargetBand); ok {
			targetBand = norm
		}
	}

	newSession := &models.Session{
		ID:              req.SessionID,
		UserID:          "user-demo-01",
		DeviceID:        req.DeviceID,
		AcquisitionMode: models.AcquisitionModeSimulated,
		StartedAt:       now,
		Duration:        0,
		Status:          "running",
		TargetBand:      targetBand,
		CreatedAt:       now,
	}

	if err := s.store.CreateSession(newSession); err != nil {
		return nil, err
	}

	if s.hub != nil {
		s.hub.StartAcquisitionWithDeviceAndTarget(req.SessionID, false, req.DeviceID, dev.Name, targetBand)
	}

	return newSession, nil
}

// IngestDeviceBatch processes and persists batch samples emitted from ESP32 gateway
func (s *Service) IngestDeviceBatch(req *models.DeviceBatchSamplesRequest) (int, error) {
	if req.SessionID == "" {
		return 0, errors.New("session_id is required")
	}
	if req.DeviceID == "" {
		return 0, errors.New("device_id is required")
	}

	sampleCount := len(req.Samples)
	hasValidSamples := sampleCount > 0
	hasValidBandPower := req.BandPower != nil && req.BandPower.IsValid()

	// 1. Rigorous payload validation: Reject empty or all-zero payloads that carry no biopotential data
	if !hasValidSamples && !hasValidBandPower {
		return 0, errors.New("invalid payload: empty samples and invalid/empty band_power; requires active EEG data")
	}

	now := time.Now()
	batchEndTime := now.UnixMilli()

	// 2. Ensure session exists (handle out-of-order ingestion packets)
	existingSession, err := s.store.GetSessionByID(req.SessionID)
	if err != nil || existingSession == nil {
		autoSession := &models.Session{
			ID:              req.SessionID,
			UserID:          "user-demo-01",
			DeviceID:        req.DeviceID,
			AcquisitionMode: models.AcquisitionModeSimulated,
			StartedAt:       now,
			Status:          "running",
			TargetBand:      "ALPHA",
			CreatedAt:       now,
		}
		_ = s.store.CreateSession(autoSession)
	}

	// 3. Convert raw 16-bit ADC samples to microvolts (uV) and persist to database FIRST
	// TGAM1 transfer function: V = (RawADC * (1.8 V / 4096) / 2000) * 1,000,000 uV
	var eegSamples []models.EEGSample
	if hasValidSamples {
		eegSamples = make([]models.EEGSample, sampleCount)
		intervalMs := 1000.0 / 512.0 // 512 Hz ~ 1.953 ms
		sqSample := 0
		if req.SignalQuality != nil {
			sqSample = *req.SignalQuality
		}

		for i, raw := range req.Samples {
			uV := (float64(raw) * (1.8 / 4096.0) / 2000.0) * 1000000.0
			eegSamples[i] = models.EEGSample{
				ID:            fmt.Sprintf("%s-s%d", req.SessionID, req.StartIndex+uint32(i)),
				SessionID:     req.SessionID,
				Timestamp:     batchEndTime - int64(float64(sampleCount-1-i)*intervalMs),
				RawEEG:        math.Round(uV*100) / 100,
				SignalQuality: sqSample,
				CreatedAt:     now,
			}
		}

		// Persist samples to storage. If database persistence fails, abort immediately without touching device timestamps
		if err := s.store.SaveEEGSamples(eegSamples); err != nil {
			return 0, err
		}
	}

	// 4. Normalize and persist brainwave band powers if included and valid in batch
	var relDelta, relTheta, relAlpha, relBeta, relGamma float64
	if hasValidBandPower {
		bp := req.BandPower
		d := float64(bp.Delta)
		t := float64(bp.Theta)
		a := float64(bp.Alpha)
		if a == 0 && (bp.LowAlpha > 0 || bp.HighAlpha > 0) {
			a = float64(bp.LowAlpha + bp.HighAlpha)
		}
		b := float64(bp.Beta)
		if b == 0 && (bp.LowBeta > 0 || bp.HighBeta > 0) {
			b = float64(bp.LowBeta + bp.HighBeta)
		}
		g := float64(bp.Gamma)
		if g == 0 && (bp.LowGamma > 0 || bp.MidGamma > 0) {
			g = float64(bp.LowGamma + bp.MidGamma)
		}

		sum := d + t + a + b + g
		if sum > 0 {
			relDelta = math.Round((d/sum)*10000.0) / 100.0
			relTheta = math.Round((t/sum)*10000.0) / 100.0
			relAlpha = math.Round((a/sum)*10000.0) / 100.0
			relBeta = math.Round((b/sum)*10000.0) / 100.0
			relGamma = math.Round((g/sum)*10000.0) / 100.0
		}

		feat := &models.BrainwaveFeature{
			ID:        fmt.Sprintf("%s-feat-%d", req.SessionID, req.StartIndex),
			SessionID: req.SessionID,
			Timestamp: batchEndTime,
			Delta:     relDelta,
			Theta:     relTheta,
			Alpha:     relAlpha,
			Beta:      relBeta,
			Gamma:     relGamma,
			CreatedAt: now,
		}
		if err := s.store.SaveBrainwaveFeature(feat); err != nil {
			return 0, err
		}
	}

	// 5. Update device heartbeat, signal quality, and LastEEGStreamAt ONLY AFTER SUCCESSFUL STORAGE
	if dev, devErr := s.store.GetDeviceByID(req.DeviceID); devErr == nil && dev != nil {
		dev.Status = "connected"
		dev.LastSeen = now
		streamTime := now
		dev.LastEEGStreamAt = &streamTime
		if req.SignalQuality != nil {
			dev.SignalQuality = req.SignalQuality
			dev.SignalQualityUpdatedAt = &streamTime
		}
		_ = s.store.UpdateDevice(dev)
	}

	// 6. Broadcast real hardware sample packet via WebSocket Hub
	if s.hub != nil && sampleCount > 0 {
		latestSample := eegSamples[sampleCount-1]
		s.hub.BroadcastSample(ws.StreamPacket{
			Type:          "eeg_sample",
			SessionID:     req.SessionID,
			Timestamp:     latestSample.Timestamp,
			RawEEG:        latestSample.RawEEG,
			SignalQuality: latestSample.SignalQuality,
			Delta:         relDelta,
			Theta:         relTheta,
			Alpha:         relAlpha,
			Beta:          relBeta,
			Gamma:         relGamma,
			DeviceStatus:  "connected",
			IsSimulation:  false, // Actual hardware ingestion
		})
	}

	return sampleCount, nil
}

// FinishDeviceSession completes an IoT recording session
func (s *Service) FinishDeviceSession(req *models.DeviceSessionFinishRequest) (*models.Session, error) {
	if req.SessionID == "" {
		return nil, errors.New("session_id is required")
	}

	ses, err := s.store.StopSession(req.SessionID)
	if err != nil {
		ses, _ = s.store.GetSessionByID(req.SessionID)
	}

	if ses != nil && req.DurationSeconds > 0 {
		ses.Duration = req.DurationSeconds
	}

	if s.hub != nil {
		s.hub.StopAcquisition()
	}

	if req.DeviceID != "" {
		if dev, devErr := s.store.GetDeviceByID(req.DeviceID); devErr == nil && dev != nil {
			dev.LastSeen = time.Now()
			_ = s.store.UpdateDevice(dev)
		}
	}

	return ses, nil
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

func (h *Handler) DeviceStartSession(c *gin.Context) {
	var req models.DeviceSessionStartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	ses, err := h.service.StartDeviceSession(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Session registered successfully",
		Data:    ses,
	})
}

func (h *Handler) DeviceIngestSamples(c *gin.Context) {
	var req models.DeviceBatchSamplesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	count, err := h.service.IngestDeviceBatch(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Samples ingested successfully",
		Data: gin.H{
			"sessionId":       req.SessionID,
			"ingestedSamples": count,
			"startIndex":      req.StartIndex,
		},
	})
}

func (h *Handler) DeviceFinishSession(c *gin.Context) {
	var req models.DeviceSessionFinishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	ses, err := h.service.FinishDeviceSession(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Session finished successfully",
		Data:    ses,
	})
}
