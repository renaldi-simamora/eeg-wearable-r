package database

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"eeg-backend/models"
)

type MemoryStore struct {
	mu          sync.RWMutex
	users       map[string]*models.User
	devices     map[string]*models.Device
	sessions    map[string]*models.Session
	eegSamples  map[string][]models.EEGSample
	brainwaves  map[string][]models.BrainwaveFeature
	predictions map[string][]models.MLPrediction
	insights    map[string][]models.AIInsight
}

func NewMemoryStore() *MemoryStore {
	ms := &MemoryStore{
		users:       make(map[string]*models.User),
		devices:     make(map[string]*models.Device),
		sessions:    make(map[string]*models.Session),
		eegSamples:  make(map[string][]models.EEGSample),
		brainwaves:  make(map[string][]models.BrainwaveFeature),
		predictions: make(map[string][]models.MLPrediction),
		insights:    make(map[string][]models.AIInsight),
	}
	ms.seed()
	return ms
}

func (m *MemoryStore) seed() {
	now := time.Now()

	// Seed Devices
	devices := []models.Device{
		{
			ID:              "dev-001",
			DeviceCode:      "EEG-001",
			Name:            "TGAM1 Wearable Headset Alpha",
			Status:          "connected",
			BatteryLevel:    88,
			SignalQuality:   94,
			FirmwareVersion: "v1.2.0-esp32",
			LastSeen:        now,
			CreatedAt:       now.Add(-72 * time.Hour),
			UpdatedAt:       now,
		},
		{
			ID:              "dev-002",
			DeviceCode:      "EEG-002",
			Name:            "TGAM1 Wearable Headset Beta",
			Status:          "disconnected",
			BatteryLevel:    62,
			SignalQuality:   0,
			FirmwareVersion: "v1.1.4-esp32",
			LastSeen:        now.Add(-5 * time.Hour),
			CreatedAt:       now.Add(-120 * time.Hour),
			UpdatedAt:       now.Add(-5 * time.Hour),
		},
		{
			ID:              "dev-003",
			DeviceCode:      "EEG-003",
			Name:            "TGAM1 Wearable Headset Gamma",
			Status:          "warning",
			BatteryLevel:    18,
			SignalQuality:   42,
			FirmwareVersion: "v1.2.0-esp32",
			LastSeen:        now.Add(-12 * time.Minute),
			CreatedAt:       now.Add(-48 * time.Hour),
			UpdatedAt:       now.Add(-12 * time.Minute),
		},
	}
	for i := range devices {
		m.devices[devices[i].ID] = &devices[i]
	}

	// Seed Sessions
	s1Ended := now.Add(-30 * time.Minute)
	s2Ended := now.Add(-2 * time.Hour)
	sessions := []models.Session{
		{
			ID:            "ses-001",
			UserID:        "user-demo-01",
			DeviceID:      "dev-001",
			StartedAt:     now.Add(-45 * time.Minute),
			EndedAt:       &s1Ended,
			Duration:      900,
			Status:        "completed",
			CreatedAt:     now.Add(-45 * time.Minute),
			DeviceName:    "TGAM1 Wearable Headset Alpha",
			DeviceCode:    "EEG-001",
			SignalQuality: 94,
		},
		{
			ID:            "ses-002",
			UserID:        "user-demo-01",
			DeviceID:      "dev-001",
			StartedAt:     now.Add(-140 * time.Minute),
			EndedAt:       &s2Ended,
			Duration:      1200,
			Status:        "completed",
			CreatedAt:     now.Add(-140 * time.Minute),
			DeviceName:    "TGAM1 Wearable Headset Alpha",
			DeviceCode:    "EEG-001",
			SignalQuality: 88,
		},
	}
	for i := range sessions {
		m.sessions[sessions[i].ID] = &sessions[i]
	}

	// Seed Brainwave features
	m.brainwaves["ses-001"] = []models.BrainwaveFeature{
		{
			ID:        "bw-001",
			SessionID: "ses-001",
			Timestamp: now.Unix() - 1800,
			Delta:     18.4,
			Theta:     24.2,
			Alpha:     36.8,
			Beta:      14.5,
			Gamma:     6.1,
			CreatedAt: now.Add(-30 * time.Minute),
		},
	}
}

func (m *MemoryStore) CreateUser(user *models.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, u := range m.users {
		if u.Email == user.Email {
			return errors.New("email already registered")
		}
	}
	m.users[user.ID] = user
	return nil
}

func (m *MemoryStore) GetUserByEmail(email string) (*models.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, u := range m.users {
		if u.Email == email {
			userCopy := *u
			return &userCopy, nil
		}
	}
	return nil, nil
}

func (m *MemoryStore) GetUserByID(id string) (*models.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	u, ok := m.users[id]
	if !ok {
		return nil, nil
	}
	userCopy := *u
	return &userCopy, nil
}

func (m *MemoryStore) UpdateUser(user *models.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if existing, ok := m.users[user.ID]; ok {
		existing.Name = user.Name
		existing.Institution = user.Institution
		existing.UpdatedAt = time.Now()
		return nil
	}
	return errors.New("user not found")
}

func (m *MemoryStore) GetDevices() ([]models.Device, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var list []models.Device
	for _, d := range m.devices {
		list = append(list, *d)
	}
	return list, nil
}

func (m *MemoryStore) GetDeviceByID(id string) (*models.Device, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	d, ok := m.devices[id]
	if !ok {
		return nil, nil
	}
	devCopy := *d
	return &devCopy, nil
}

func (m *MemoryStore) CreateDevice(device *models.Device) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, d := range m.devices {
		if d.DeviceCode == device.DeviceCode {
			return errors.New("device code already exists")
		}
	}
	m.devices[device.ID] = device
	return nil
}

func (m *MemoryStore) UpdateDevice(device *models.Device) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	d, ok := m.devices[device.ID]
	if !ok {
		return errors.New("device not found")
	}
	d.Name = device.Name
	d.Status = device.Status
	d.BatteryLevel = device.BatteryLevel
	d.SignalQuality = device.SignalQuality
	d.UpdatedAt = time.Now()
	d.LastSeen = device.LastSeen
	return nil
}

func (m *MemoryStore) DeleteDevice(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.devices[id]; !ok {
		return errors.New("device not found")
	}
	delete(m.devices, id)
	return nil
}

func (m *MemoryStore) GetSessions(userID string) ([]models.Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var list []models.Session
	for _, s := range m.sessions {
		if userID == "" || s.UserID == userID {
			sesCopy := *s
			if dev, ok := m.devices[s.DeviceID]; ok {
				sesCopy.DeviceName = dev.Name
				sesCopy.DeviceCode = dev.DeviceCode
				sesCopy.SignalQuality = dev.SignalQuality
			}
			list = append(list, sesCopy)
		}
	}
	return list, nil
}

func (m *MemoryStore) GetSessionByID(id string) (*models.Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, ok := m.sessions[id]
	if !ok {
		return nil, nil
	}
	sesCopy := *s
	if dev, ok := m.devices[s.DeviceID]; ok {
		sesCopy.DeviceName = dev.Name
		sesCopy.DeviceCode = dev.DeviceCode
		sesCopy.SignalQuality = dev.SignalQuality
	}
	return &sesCopy, nil
}

func (m *MemoryStore) CreateSession(session *models.Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sessions[session.ID] = session
	return nil
}

func (m *MemoryStore) StopSession(id string) (*models.Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, ok := m.sessions[id]
	if !ok {
		return nil, fmt.Errorf("session not found")
	}
	now := time.Now()
	s.EndedAt = &now
	s.Duration = int(now.Sub(s.StartedAt).Seconds())
	if s.Duration < 0 {
		s.Duration = 0
	}
	s.Status = "completed"

	sesCopy := *s
	if dev, ok := m.devices[s.DeviceID]; ok {
		sesCopy.DeviceName = dev.Name
		sesCopy.DeviceCode = dev.DeviceCode
		sesCopy.SignalQuality = dev.SignalQuality
	}
	return &sesCopy, nil
}

func (m *MemoryStore) SaveEEGSamples(samples []models.EEGSample) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, sample := range samples {
		m.eegSamples[sample.SessionID] = append(m.eegSamples[sample.SessionID], sample)
	}
	return nil
}

func (m *MemoryStore) GetEEGSamples(sessionID string) ([]models.EEGSample, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.eegSamples[sessionID], nil
}

func (m *MemoryStore) SaveBrainwaveFeature(feature *models.BrainwaveFeature) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.brainwaves[feature.SessionID] = append(m.brainwaves[feature.SessionID], *feature)
	return nil
}

func (m *MemoryStore) GetBrainwaveFeatures(sessionID string) ([]models.BrainwaveFeature, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.brainwaves[sessionID], nil
}

func (m *MemoryStore) GetMLPredictions(sessionID string) ([]models.MLPrediction, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.predictions[sessionID], nil
}

func (m *MemoryStore) GetAIInsights(sessionID string) ([]models.AIInsight, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.insights[sessionID], nil
}
