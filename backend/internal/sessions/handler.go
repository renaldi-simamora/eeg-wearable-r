package sessions

import (
	"errors"
	"fmt"
	"math"
	"net/http"
	"strings"
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
			// 1. Gateway connectivity & telemetry heartbeat verification (<= 60s)
			if dev.Status != "connected" || dev.LastSeen.IsZero() || time.Since(dev.LastSeen) > 60*time.Second {
				return nil, fmt.Errorf("device '%s' is not actively online (status: %s); live acquisition requires an active, connected physical hardware gateway", dev.ID, dev.Status)
			}
			// 2. Active TGAM1 biopotential sample stream verification (<= 30s)
			if dev.LastEEGStreamAt == nil || dev.LastEEGStreamAt.IsZero() || time.Since(*dev.LastEEGStreamAt) > 30*time.Second {
				return nil, fmt.Errorf("device '%s' connected but no active EEG stream received from TGAM1; verify sensor contact and TGAM1 power", dev.ID)
			}
			// 3. Verified Signal Quality availability (must not be uninitialized/nil)
			if dev.SignalQuality == nil {
				return nil, fmt.Errorf("device '%s' has not received any signal quality telemetry from TGAM1; live acquisition requires verified electrode contact", dev.ID)
			}
			// 4. Signal Quality freshness check (must be fresh within 30s)
			if dev.SignalQualityUpdatedAt == nil || dev.SignalQualityUpdatedAt.IsZero() || time.Since(*dev.SignalQualityUpdatedAt) > 30*time.Second {
				return nil, fmt.Errorf("device '%s' signal quality data is stale (> 30s); live acquisition requires fresh electrode contact telemetries", dev.ID)
			}
			// 5. Lead contact check (TGAM1 poor quality 200 = total lead-off)
			if *dev.SignalQuality >= 200 {
				return nil, fmt.Errorf("device '%s' reports total electrode lead-off (poor signal quality %d >= 200); ensure dry electrodes have solid skin contact before starting live session", dev.ID, *dev.SignalQuality)
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

	if sessions == nil {
		sessions = []models.Session{}
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

func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")
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
