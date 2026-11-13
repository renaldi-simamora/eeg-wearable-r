package database

import (
	"time"

	"eeg-backend/models"
)

type Store interface {
	// User methods
	CreateUser(user *models.User) error
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(id string) (*models.User, error)
	GetUsers() ([]models.User, error)
	UpdateUser(user *models.User) error
	UpdateUserStatus(id string, status string) error
	ResetUserPassword(id string, passwordHash string) error
	UpdateUserLastLogin(id string, lastLogin time.Time) error

	// Device methods
	GetDevices() ([]models.Device, error)
	GetDeviceByID(id string) (*models.Device, error)
	CreateDevice(device *models.Device) error
	UpdateDevice(device *models.Device) error
	DeleteDevice(id string) error

	// Session methods
	GetSessions(userID string) ([]models.Session, error)
	GetSessionByID(id string) (*models.Session, error)
	GetActiveSessionByDevice(deviceID string) (*models.Session, error)
	CreateSession(session *models.Session) error
	UpdateSession(session *models.Session) error
	RequestStopSession(id string) (*models.Session, error)
	StopSession(id string) (*models.Session, error)
	FinalizeSession(id string) (*models.Session, bool, error)
	FinalizeSessionWithJob(id string) (*models.Session, *models.MLClassificationJob, bool, error)
	RecoverStaleStopRequestedSessions(cutoffDuration time.Duration) ([]models.Session, error)
	ReconcileCompletedSessionsWithoutJobs() ([]models.MLClassificationJob, error)

	// EEG & Brainwave methods
	SaveEEGSamples(samples []models.EEGSample) error
	GetEEGSamples(sessionID string) ([]models.EEGSample, error)
	SaveBrainwaveFeature(feature *models.BrainwaveFeature) error
	GetBrainwaveFeatures(sessionID string) ([]models.BrainwaveFeature, error)

	// Analysis & Insights methods
	SaveMLPrediction(pred *models.MLPrediction) error
	GetMLPredictions(sessionID string) ([]models.MLPrediction, error)
	SaveAIInsight(insight *models.AIInsight) error
	GetAIInsights(sessionID string) ([]models.AIInsight, error)

	// Durable ML Classification Job methods
	CreateMLJob(job *models.MLClassificationJob) error
	GetMLJobBySessionID(sessionID string) (*models.MLClassificationJob, error)
	ClaimNextPendingMLJobs(limit int) ([]models.MLClassificationJob, error)
	UpdateMLJob(job *models.MLClassificationJob) error

	// Lifecycle methods
	Close() error
}
