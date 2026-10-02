package database

import (
	"eeg-backend/models"
)

type Store interface {
	// User methods
	CreateUser(user *models.User) error
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(id string) (*models.User, error)
	UpdateUser(user *models.User) error

	// Device methods
	GetDevices() ([]models.Device, error)
	GetDeviceByID(id string) (*models.Device, error)
	CreateDevice(device *models.Device) error
	UpdateDevice(device *models.Device) error
	DeleteDevice(id string) error

	// Session methods
	GetSessions(userID string) ([]models.Session, error)
	GetSessionByID(id string) (*models.Session, error)
	CreateSession(session *models.Session) error
	StopSession(id string) (*models.Session, error)

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
}
