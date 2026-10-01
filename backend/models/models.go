package models

import "time"

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
	ID              string    `json:"id" db:"id"`
	DeviceCode      string    `json:"deviceCode" db:"device_code"`
	Name            string    `json:"name" db:"name"`
	Status          string    `json:"status" db:"status"` // 'connected' | 'disconnected' | 'warning'
	BatteryLevel    int       `json:"batteryLevel" db:"battery_level"`
	SignalQuality   int       `json:"signalQuality" db:"signal_quality"`
	FirmwareVersion string    `json:"firmwareVersion" db:"firmware_version"`
	LastSeen        time.Time `json:"lastSeen" db:"last_seen"`
	CreatedAt       time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt       time.Time `json:"updatedAt" db:"updated_at"`
}

// Session domain model
type Session struct {
	ID        string     `json:"id" db:"id"`
	UserID    string     `json:"userId" db:"user_id"`
	DeviceID  string     `json:"deviceId" db:"device_id"`
	StartedAt time.Time  `json:"startedAt" db:"started_at"`
	EndedAt   *time.Time `json:"endedAt,omitempty" db:"ended_at"`
	Duration  int        `json:"duration" db:"duration"` // in seconds
	Status    string     `json:"status" db:"status"`     // 'running' | 'completed' | 'cancelled'
	CreatedAt time.Time  `json:"createdAt" db:"created_at"`

	// Relational details populated when fetched
	DeviceName    string `json:"deviceName,omitempty"`
	DeviceCode    string `json:"deviceCode,omitempty"`
	SignalQuality int    `json:"signalQuality,omitempty"`
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

type CreateSessionRequest struct {
	DeviceID string `json:"deviceId" binding:"required"`
}

type PostEEGDataRequest struct {
	SessionID     string    `json:"sessionId" binding:"required"`
	Samples       []EEGSample `json:"samples"`
	Features      *BrainwaveFeature `json:"features,omitempty"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type DashboardSummary struct {
	DeviceStatus         string             `json:"deviceStatus"`
	SignalQuality        string             `json:"signalQuality"`
	SignalQualityValue   int                `json:"signalQualityValue"`
	TotalSessions        int                `json:"totalSessions"`
	LatestSessionDuration string            `json:"latestSessionDuration"`
	LatestDurationSeconds int               `json:"latestDurationSeconds"`
	AverageDuration       string            `json:"averageDuration"`
	LatestClassification string             `json:"latestClassification"`
	ActiveDevice         *Device            `json:"activeDevice"`
	RecentSessions       []Session          `json:"recentSessions"`
	BrainwaveOverview    BrainwaveFeature   `json:"brainwaveOverview"`
	DeviceHealth         DeviceHealthInfo   `json:"deviceHealth"`
}

type DeviceHealthInfo struct {
	EEGModuleStatus string    `json:"eegModuleStatus"`
	ESP32Status     string    `json:"esp32Status"`
	WiFiStatus      string    `json:"wifiStatus"`
	BatteryLevel    int       `json:"batteryLevel"`
	SignalQuality   int       `json:"signalQuality"`
	LastSync        time.Time `json:"lastSync"`
}

type ModelCardInfo struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Definition  string                 `json:"definition"`
	Status      string                 `json:"status"` // 'Not connected'
	Metrics     map[string]interface{} `json:"metrics"`
	FutureNote  string                 `json:"futureNote"`
}
