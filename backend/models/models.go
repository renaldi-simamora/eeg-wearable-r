package models

import (
	"strings"
	"time"
)

// User domain model
type User struct {
	ID           string    `json:"id" db:"id"`
	Name         string    `json:"name" db:"name"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Role         string    `json:"role" db:"role"`
	Institution  string    `json:"institution" db:"institution"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time `json:"updatedAt" db:"updated_at"`
}

// Device domain model
type Device struct {
	ID                     string     `json:"id" db:"id"`
	DeviceCode             string     `json:"deviceCode" db:"device_code"`
	Name                   string     `json:"name" db:"name"`
	Status                 string     `json:"status" db:"status"` // 'connected' | 'disconnected' | 'warning'
	BatteryLevel           int        `json:"batteryLevel" db:"battery_level"`
	SignalQuality          *int       `json:"signalQuality" db:"signal_quality"` // nil = Not Available / uninitialized; 0 = Good; 1-199 = Noise level; 200 = Lead-off
	SignalQualityUpdatedAt *time.Time `json:"signalQualityUpdatedAt,omitempty" db:"signal_quality_updated_at"`
	FirmwareVersion        string     `json:"firmwareVersion" db:"firmware_version"`
	LastSeen               time.Time  `json:"lastSeen" db:"last_seen"`                           // Wi-Fi telemetry & gateway heartbeat
	LastEEGStreamAt        *time.Time `json:"lastEEGStreamAt,omitempty" db:"last_eeg_stream_at"` // Actual TGAM1 biopotential sample stream timestamp
	CreatedAt              time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt              time.Time  `json:"updatedAt" db:"updated_at"`
}

// Session statuses
const (
	SessionStatusRunning       = "running"
	SessionStatusStopRequested = "stop_requested"
	SessionStatusCompleted     = "completed"
	SessionStatusCancelled     = "cancelled"
)

// Session domain model
type Session struct {
	ID              string     `json:"id" db:"id"`
	UserID          string     `json:"userId" db:"user_id"`
	DeviceID        string     `json:"deviceId" db:"device_id"`
	ParticipantName string     `json:"participantName" db:"participant_name"`
	Title           string     `json:"title" db:"title"`
	Notes           string     `json:"notes" db:"notes"`
	AcquisitionMode string     `json:"acquisitionMode" db:"acquisition_mode"` // 'live' | 'simulated' | 'unknown'
	StartedAt       time.Time  `json:"startedAt" db:"started_at"`
	EndedAt         *time.Time `json:"endedAt,omitempty" db:"ended_at"`
	Duration        int        `json:"duration" db:"duration"`      // in seconds
	Status          string     `json:"status" db:"status"`          // 'running' | 'stop_requested' | 'completed' | 'cancelled'
	TargetBand      string     `json:"targetBand" db:"target_band"` // 'DELTA' | 'THETA' | 'ALPHA' | 'BETA' | 'GAMMA'
	CreatedAt       time.Time  `json:"createdAt" db:"created_at"`

	// Relational details populated when fetched
	DeviceName    string `json:"deviceName,omitempty"`
	DeviceCode    string `json:"deviceCode,omitempty"`
	SignalQuality *int   `json:"signalQuality,omitempty"`
}

// EEGSample represents high-frequency raw voltage readings
type EEGSample struct {
	ID            string    `json:"id" db:"id"`
	SessionID     string    `json:"sessionId" db:"session_id"`
	Timestamp     int64     `json:"timestamp" db:"timestamp"`
	RawEEG        float64   `json:"rawEEG" db:"raw_eeg"`
	SignalQuality int       `json:"signalQuality" db:"signal_quality"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
}

// BrainwaveFeature holds spectral band powers computed from EEG
type BrainwaveFeature struct {
	ID        string    `json:"id" db:"id"`
	SessionID string    `json:"sessionId" db:"session_id"`
	Timestamp int64     `json:"timestamp" db:"timestamp"`
	Delta     float64   `json:"delta" db:"delta"` // 0.5 - 4 Hz
	Theta     float64   `json:"theta" db:"theta"` // 4 - 8 Hz
	Alpha     float64   `json:"alpha" db:"alpha"` // 8 - 13 Hz
	Beta      float64   `json:"beta" db:"beta"`   // 13 - 30 Hz
	Gamma     float64   `json:"gamma" db:"gamma"` // 30 - 50 Hz
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

// MLPrediction (future-ready architecture)
type MLPrediction struct {
	ID             string    `json:"id" db:"id"`
	SessionID      string    `json:"sessionId" db:"session_id"`
	Timestamp      int64     `json:"timestamp" db:"timestamp"`
	ModelName      string    `json:"modelName" db:"model_name"`
	ModelVersion   string    `json:"modelVersion" db:"model_version"`
	PredictedClass string    `json:"predictedClass" db:"predicted_class"`
	Confidence     float64   `json:"confidence" db:"confidence"`
	CreatedAt      time.Time `json:"createdAt" db:"created_at"`
}

// AIInsight (future-ready architecture)
type AIInsight struct {
	ID        string    `json:"id" db:"id"`
	SessionID string    `json:"sessionId" db:"session_id"`
	Title     string    `json:"title" db:"title"`
	Summary   string    `json:"summary" db:"summary"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

// DTOs & Request/Response Types

type RegisterRequest struct {
	Name        string `json:"name" binding:"required,min=2"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
	Institution string `json:"institution"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type GoogleAuthRequest struct {
	Credential string `json:"credential" binding:"required"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type UpdateUserRequest struct {
	Name        string `json:"name" binding:"required"`
	Institution string `json:"institution"`
}

type CreateDeviceRequest struct {
	DeviceCode      string `json:"deviceCode" binding:"required"`
	Name            string `json:"name" binding:"required"`
	FirmwareVersion string `json:"firmwareVersion"`
}

type UpdateDeviceRequest struct {
	Name          string `json:"name"`
	Status        string `json:"status"`
	BatteryLevel  *int   `json:"batteryLevel"`
	SignalQuality *int   `json:"signalQuality"`
}

// EEGTarget enum definitions
type EEGTarget string

const (
	TargetDelta EEGTarget = "DELTA"
	TargetTheta EEGTarget = "THETA"
	TargetAlpha EEGTarget = "ALPHA"
	TargetBeta  EEGTarget = "BETA"
	TargetGamma EEGTarget = "GAMMA"
)

// NormalizeTargetBand validates and normalizes target band strings into standard uppercase enum
func NormalizeTargetBand(target string) (string, bool) {
	switch strings.ToUpper(strings.TrimSpace(target)) {
	case "DELTA":
		return string(TargetDelta), true
	case "THETA":
		return string(TargetTheta), true
	case "ALPHA", "ALFA":
		return string(TargetAlpha), true
	case "BETA":
		return string(TargetBeta), true
	case "GAMMA":
		return string(TargetGamma), true
	default:
		return "", false
	}
}

// Acquisition mode constants
const (
	AcquisitionModeLive      = "live"
	AcquisitionModeSimulated = "simulated"
	AcquisitionModeUnknown   = "unknown"
)

// NormalizeAcquisitionMode converts incoming strings to canonical acquisition mode
func NormalizeAcquisitionMode(raw string) (string, bool) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "live":
		return AcquisitionModeLive, true
	case "simulated", "simulation", "demo", "mock":
		return AcquisitionModeSimulated, true
	case "unknown":
		return AcquisitionModeUnknown, true
	default:
		return "", false
	}
}

type CreateSessionRequest struct {
	DeviceID        string `json:"deviceId" binding:"required"`
	ParticipantName string `json:"participantName"`
	Title           string `json:"title"`
	Notes           string `json:"notes"`
	AcquisitionMode string `json:"acquisitionMode"` // 'live' | 'simulated' | 'unknown'
	TargetBand      string `json:"targetBand"`
}

type UpdateSessionRequest struct {
	ParticipantName string `json:"participantName,omitempty"`
	Title           string `json:"title,omitempty"`
	Notes           string `json:"notes,omitempty"`
}

type SignalStatistics struct {
	Mean   float64 `json:"mean"`
	Min    float64 `json:"min"`
	Max    float64 `json:"max"`
	StdDev float64 `json:"stdDev"`
	Unit   string  `json:"unit"` // e.g. "µV (estimated)" or "raw_adc"

	// Deprecated: Backwards-compatibility aliases only.
	// NOTICE: These fields reflect mathematical estimations from nominal ADC scaling (RawADC * 0.22 µV)
	// and MUST NOT be misinterpreted as laboratory calibrated biopotential microvolts.
	// Modern API consumers should use 'mean', 'min', 'max' with the explicit 'unit' descriptor.
	MeanMicrovolts float64 `json:"meanMicrovolts"`
	MinMicrovolts  float64 `json:"minMicrovolts"`
	MaxMicrovolts  float64 `json:"maxMicrovolts"`
}

// SessionAnalysisReport represents a comprehensive, academic EEG session report
type SessionAnalysisReport struct {
	SessionID         string     `json:"sessionId"`
	ParticipantName   string     `json:"participantName"`
	Title             string     `json:"title"`
	Notes             string     `json:"notes"`
	AcquisitionMode   string     `json:"acquisitionMode"` // 'live' | 'simulated' | 'unknown'
	Status            string     `json:"status"`          // 'running' | 'completed'
	TargetBand        string     `json:"targetBand"`
	StartedAt         time.Time  `json:"startedAt"`
	EndedAt           *time.Time `json:"endedAt,omitempty"`
	DurationSeconds   int        `json:"durationSeconds"`
	FormattedDuration string     `json:"formattedDuration"`

	DeviceID           string `json:"deviceId"`
	DeviceName         string `json:"deviceName"`
	DeviceCode         string `json:"deviceCode"`
	SignalQuality      *int   `json:"signalQuality"`      // nil = Not Available; 0 = Good; 1-199 = Noise level; 200 = Lead-off
	SignalQualityLabel string `json:"signalQualityLabel"` // "Good Contact", "Poor Signal / Noise Level (X/200)", "Lead-off (Electrode Disconnected)", "Not Available"
	SamplingRateHz     int    `json:"samplingRateHz"`     // Nominal 512 Hz (datasheet specification; unverified on lab hardware)
	SamplingRateStatus string `json:"samplingRateStatus"` // "nominal_unverified" or "empirically_measured"
	ChannelCount       int    `json:"channelCount"`       // 1 (Single channel)
	LeadLocation       string `json:"leadLocation"`       // "FP1 (Pre-frontal dry electrode)"

	TotalSamples int              `json:"totalSamples"`
	SignalStats  SignalStatistics `json:"signalStats"`

	AverageBandPower BrainwaveFeature `json:"averageBandPower"`
	DominantBand     string           `json:"dominantBand"`    // Measured dominant frequency band
	DominantBandPct  float64          `json:"dominantBandPct"` // Relative percentage (%)

	MLStatus     string        `json:"mlStatus"` // "available" | "unavailable"
	MLPrediction *MLPrediction `json:"mlPrediction,omitempty"`
	MLNote       string        `json:"mlNote"`

	Samples  []EEGSample        `json:"samples"`
	Features []BrainwaveFeature `json:"features"`
}

type PostEEGDataRequest struct {
	SessionID string            `json:"sessionId" binding:"required"`
	Samples   []EEGSample       `json:"samples"`
	Features  *BrainwaveFeature `json:"features,omitempty"`
}

// DeviceSessionStartRequest represents payload from ESP32 on session registration
type DeviceSessionStartRequest struct {
	SessionID          string `json:"session_id" binding:"required"`
	DeviceID           string `json:"device_id" binding:"required"`
	MaxDurationSeconds int    `json:"max_duration_seconds"`
	Format             string `json:"format"`
	SamplingRateHz     int    `json:"sampling_rate_hz"`
	ChannelCount       int    `json:"channel_count"`
	LeadLocation       string `json:"lead_location"`
	Status             string `json:"status"`
	TargetBand         string `json:"target_band"`
}

// DeviceBandPower holds raw 8-subband or 5-band ASIC integer power values
type DeviceBandPower struct {
	Delta     uint32 `json:"delta"`
	Theta     uint32 `json:"theta"`
	Alpha     uint32 `json:"alpha"`
	Beta      uint32 `json:"beta"`
	Gamma     uint32 `json:"gamma"`
	LowAlpha  uint32 `json:"low_alpha"`
	HighAlpha uint32 `json:"high_alpha"`
	LowBeta   uint32 `json:"low_beta"`
	HighBeta  uint32 `json:"high_beta"`
	LowGamma  uint32 `json:"low_gamma"`
	MidGamma  uint32 `json:"mid_gamma"`
}

// IsValid returns true only if BandPower is non-nil and contains non-zero, non-empty spectral power
func (bp *DeviceBandPower) IsValid() bool {
	if bp == nil {
		return false
	}
	sum := bp.Delta + bp.Theta + bp.Alpha + bp.Beta + bp.Gamma + bp.LowAlpha + bp.HighAlpha + bp.LowBeta + bp.HighBeta + bp.LowGamma + bp.MidGamma
	return sum > 0
}

// DeviceBatchSamplesRequest represents batch of raw EEG samples emitted by ESP32 gateway
type DeviceBatchSamplesRequest struct {
	SessionID     string           `json:"session_id" binding:"required"`
	DeviceID      string           `json:"device_id" binding:"required"`
	StartIndex    uint32           `json:"start_index"`
	Format        string           `json:"format"`
	SampleCount   int              `json:"sample_count"`
	SignalQuality *int             `json:"signal_quality,omitempty"` // ThinkGear byte 0x02 (0=good, 200=lead off, nil=not provided)
	BandPower     *DeviceBandPower `json:"band_power,omitempty"`
	Samples       []int16          `json:"samples"` // raw 16-bit 2's complement ADC values
}

// DeviceSessionFinishRequest represents payload from ESP32 on session termination
type DeviceSessionFinishRequest struct {
	SessionID       string `json:"session_id" binding:"required"`
	DeviceID        string `json:"device_id" binding:"required"`
	DurationSeconds int    `json:"duration_seconds"`
	TotalSamples    uint32 `json:"total_samples"`
	ValidPackets    uint32 `json:"valid_packets"`
	InvalidPackets  uint32 `json:"invalid_packets"`
	Status          string `json:"status"`
	Reason          string `json:"reason"`
}

// DevicePollResponse represents device status and command payload for polling
type DevicePollResponse struct {
	DeviceID         string `json:"device_id"`
	Command          string `json:"command"` // "IDLE" | "START" | "STOP"
	HasActiveSession bool   `json:"has_active_session"`
	SessionID        string `json:"session_id,omitempty"`
	TargetBand       string `json:"target_band,omitempty"`
	AcquisitionMode  string `json:"acquisition_mode,omitempty"`
	SamplingRateHz   int    `json:"sampling_rate_hz,omitempty"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type DashboardSummary struct {
	DeviceStatus          string           `json:"deviceStatus"`
	SignalQuality         string           `json:"signalQuality"`
	SignalQualityValue    *int             `json:"signalQualityValue,omitempty"`
	TotalSessions         int              `json:"totalSessions"`
	LatestSessionDuration string           `json:"latestSessionDuration"`
	LatestDurationSeconds int              `json:"latestDurationSeconds"`
	AverageDuration       string           `json:"averageDuration"`
	LatestClassification  string           `json:"latestClassification"`
	ActiveDevice          *Device          `json:"activeDevice"`
	RecentSessions        []Session        `json:"recentSessions"`
	BrainwaveOverview     BrainwaveFeature `json:"brainwaveOverview"`
	DeviceHealth          DeviceHealthInfo `json:"deviceHealth"`
}

type DeviceHealthInfo struct {
	EEGModuleStatus string    `json:"eegModuleStatus"`
	ESP32Status     string    `json:"esp32Status"`
	WiFiStatus      string    `json:"wifiStatus"`
	BatteryLevel    int       `json:"batteryLevel"`
	SignalQuality   *int      `json:"signalQuality"`
	LastSync        time.Time `json:"lastSync"`
}

type ModelCardInfo struct {
	ID         string                 `json:"id"`
	Name       string                 `json:"name"`
	Definition string                 `json:"definition"`
	Status     string                 `json:"status"` // 'Not connected'
	Metrics    map[string]interface{} `json:"metrics"`
	FutureNote string                 `json:"futureNote"`
}

// MLClassificationJob represents a durable background classification task
type MLClassificationJob struct {
	ID          string     `json:"id" db:"id"`
	SessionID   string     `json:"sessionId" db:"session_id"`
	Status      string     `json:"status" db:"status"` // "pending" | "processing" | "completed" | "failed"
	Attempts    int        `json:"attempts" db:"attempts"`
	MaxAttempts int        `json:"maxAttempts" db:"max_attempts"`
	LastError   string     `json:"lastError,omitempty" db:"last_error"`
	NextRunAt   time.Time  `json:"nextRunAt" db:"next_run_at"`
	CreatedAt   time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time  `json:"updatedAt" db:"updated_at"`
	CompletedAt *time.Time `json:"completedAt,omitempty" db:"completed_at"`
}
