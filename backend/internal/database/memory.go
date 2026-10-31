package database

import (
	"errors"
	"fmt"
	"math"
	"math/rand"
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

	// Seed Admin Researcher User (admin@gmail.com / admin123)
	adminUser := &models.User{
		ID:           "user-demo-01",
		Name:         "Super Admin NeuroPulse",
		Email:        "admin@gmail.com",
		PasswordHash: "$2b$12$v8Ub2IyTcwHCrvKT79hWAOJcT.sZhlsBS5h60UqkkRE7yATnN16li",
		Role:         "researcher",
		Institution:  "IPB University",
		CreatedAt:    now.Add(-72 * time.Hour),
		UpdatedAt:    now,
	}
	m.users[adminUser.ID] = adminUser

	// Seed Devices (5 devices representing 5 primary EEG band protocols)
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
			Status:          "connected",
			BatteryLevel:    82,
			SignalQuality:   91,
			FirmwareVersion: "v1.1.4-esp32",
			LastSeen:        now,
			CreatedAt:       now.Add(-120 * time.Hour),
			UpdatedAt:       now,
		},
		{
			ID:              "dev-003",
			DeviceCode:      "EEG-003",
			Name:            "TGAM1 Wearable Headset Gamma",
			Status:          "connected",
			BatteryLevel:    85,
			SignalQuality:   93,
			FirmwareVersion: "v1.2.0-esp32",
			LastSeen:        now,
			CreatedAt:       now.Add(-48 * time.Hour),
			UpdatedAt:       now,
		},
		{
			ID:              "dev-004",
			DeviceCode:      "EEG-004",
			Name:            "TGAM1 Wearable Headset Delta",
			Status:          "connected",
			BatteryLevel:    94,
			SignalQuality:   96,
			FirmwareVersion: "v1.2.0-esp32",
			LastSeen:        now,
			CreatedAt:       now.Add(-36 * time.Hour),
			UpdatedAt:       now,
		},
		{
			ID:              "dev-005",
			DeviceCode:      "EEG-005",
			Name:            "TGAM1 Wearable Headset Theta",
			Status:          "connected",
			BatteryLevel:    87,
			SignalQuality:   92,
			FirmwareVersion: "v1.2.0-esp32",
			LastSeen:        now,
			CreatedAt:       now.Add(-24 * time.Hour),
			UpdatedAt:       now,
		},
	}
	for i := range devices {
		m.devices[devices[i].ID] = &devices[i]
	}

	// Seed 5 diverse sessions representing each of the 5 primary EEG band protocols
	s1Ended := now.Add(-30 * time.Minute)
	s2Ended := now.Add(-120 * time.Minute)
	s3Ended := now.Add(-240 * time.Minute)
	s4Ended := now.Add(-360 * time.Minute)
	s5Ended := now.Add(-480 * time.Minute)

	sessions := []models.Session{
		{
			ID:            "ses-001",
			UserID:        "user-demo-01",
			DeviceID:      "dev-001",
			StartedAt:     now.Add(-45 * time.Minute),
			EndedAt:       &s1Ended,
			Duration:      900,
			Status:        "completed",
			TargetBand:    "ALPHA",
			CreatedAt:     now.Add(-45 * time.Minute),
			DeviceName:    "TGAM1 Wearable Headset Alpha",
			DeviceCode:    "EEG-001",
			SignalQuality: 94,
		},
		{
			ID:            "ses-002",
			UserID:        "user-demo-01",
			DeviceID:      "dev-002",
			StartedAt:     now.Add(-140 * time.Minute),
			EndedAt:       &s2Ended,
			Duration:      1200,
			Status:        "completed",
			TargetBand:    "BETA",
			CreatedAt:     now.Add(-140 * time.Minute),
			DeviceName:    "TGAM1 Wearable Headset Beta",
			DeviceCode:    "EEG-002",
			SignalQuality: 91,
		},
		{
			ID:            "ses-003",
			UserID:        "user-demo-01",
			DeviceID:      "dev-003",
			StartedAt:     now.Add(-252 * time.Minute),
			EndedAt:       &s3Ended,
			Duration:      720,
			Status:        "completed",
			TargetBand:    "GAMMA",
			CreatedAt:     now.Add(-252 * time.Minute),
			DeviceName:    "TGAM1 Wearable Headset Gamma",
			DeviceCode:    "EEG-003",
			SignalQuality: 89,
		},
		{
			ID:            "ses-004",
			UserID:        "user-demo-01",
			DeviceID:      "dev-004",
			StartedAt:     now.Add(-385 * time.Minute),
			EndedAt:       &s4Ended,
			Duration:      1500,
			Status:        "completed",
			TargetBand:    "DELTA",
			CreatedAt:     now.Add(-385 * time.Minute),
			DeviceName:    "TGAM1 Wearable Headset Delta",
			DeviceCode:    "EEG-004",
			SignalQuality: 96,
		},
		{
			ID:            "ses-005",
			UserID:        "user-demo-01",
			DeviceID:      "dev-005",
			StartedAt:     now.Add(-498 * time.Minute),
			EndedAt:       &s5Ended,
			Duration:      1080,
			Status:        "completed",
			TargetBand:    "THETA",
			CreatedAt:     now.Add(-498 * time.Minute),
			DeviceName:    "TGAM1 Wearable Headset Theta",
			DeviceCode:    "EEG-005",
			SignalQuality: 93,
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
			Timestamp: now.UnixMilli() - 1800000,
			Delta:     10.5,
			Theta:     15.0,
			Alpha:     48.0, // Alpha Dominant (48%)
			Beta:      18.0,
			Gamma:     8.5,
			CreatedAt: now.Add(-30 * time.Minute),
		},
	}
	m.brainwaves["ses-002"] = []models.BrainwaveFeature{
		{
			ID:        "bw-002",
			SessionID: "ses-002",
			Timestamp: now.UnixMilli() - 7200000,
			Delta:     9.5,
			Theta:     13.5,
			Alpha:     19.0,
			Beta:      45.0, // Beta Dominant (45%)
			Gamma:     13.0,
			CreatedAt: now.Add(-120 * time.Minute),
		},
	}
	m.brainwaves["ses-003"] = []models.BrainwaveFeature{
		{
			ID:        "bw-003",
			SessionID: "ses-003",
			Timestamp: now.UnixMilli() - 14400000,
			Delta:     8.0,
			Theta:     11.0,
			Alpha:     15.0,
			Beta:      26.0,
			Gamma:     40.0, // Gamma Dominant (40%)
			CreatedAt: now.Add(-240 * time.Minute),
		},
	}
	m.brainwaves["ses-004"] = []models.BrainwaveFeature{
		{
			ID:        "bw-004",
			SessionID: "ses-004",
			Timestamp: now.UnixMilli() - 21600000,
			Delta:     52.0, // Delta Dominant (52%)
			Theta:     20.0,
			Alpha:     13.0,
			Beta:      9.5,
			Gamma:     5.5,
			CreatedAt: now.Add(-360 * time.Minute),
		},
	}
	m.brainwaves["ses-005"] = []models.BrainwaveFeature{
		{
			ID:        "bw-005",
			SessionID: "ses-005",
			Timestamp: now.UnixMilli() - 28800000,
			Delta:     17.0,
			Theta:     47.0, // Theta Dominant (47%)
			Alpha:     17.5,
			Beta:      12.0,
			Gamma:     6.5,
			CreatedAt: now.Add(-480 * time.Minute),
		},
	}

	// Seed 120 physiological samples per session
	for sIdx, s := range sessions {
		samples := make([]models.EEGSample, 120)
		cycles := 17.0
		switch sIdx {
		case 0:
			cycles = 17.0 // Alpha
		case 1:
			cycles = 32.0 // Beta
		case 2:
			cycles = 48.0 // Gamma
		case 3:
			cycles = 3.2 // Delta
		case 4:
			cycles = 7.5 // Theta
		}

		for i := 0; i < 120; i++ {
			phase := (float64(i) * 2.0 * math.Pi * cycles) / 120.0
			var val float64
			switch sIdx {
			case 0:
				env := 18.0 + 5.0*math.Cos((float64(i)*2.0*math.Pi*1.5)/120.0)
				val = env*math.Sin(phase) + 2.0*math.Sin(phase*2.0+0.4)
			case 1:
				val = 12.0*math.Sin(phase) + 3.5*math.Sin(phase*0.7+0.9) + 2.0*math.Sin(phase*1.4+2.1)
			case 2:
				val = 6.5*math.Sin(phase) + 2.5*math.Sin(phase*1.35+0.4)
			case 3:
				val = 36.0*math.Sin(phase) + 6.0*math.Sin(phase*0.45+0.8)
			case 4:
				val = 24.0*math.Sin(phase) + 5.0*math.Sin(phase*0.5+1.2)
			}
			val += (rand.Float64()*2.0 - 1.0) * 0.8

			samples[i] = models.EEGSample{
				ID:            fmt.Sprintf("s%d-%d", sIdx+1, i),
				SessionID:     s.ID,
				Timestamp:     s.StartedAt.UnixMilli() + int64(i*20),
				RawEEG:        math.Round(val*100) / 100,
				SignalQuality: s.SignalQuality,
				CreatedAt:     s.StartedAt,
			}
		}
		m.eegSamples[s.ID] = samples
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
	if session.TargetBand == "" {
		session.TargetBand = "ALPHA"
	}
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

func (m *MemoryStore) SaveMLPrediction(pred *models.MLPrediction) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.predictions[pred.SessionID] = append(m.predictions[pred.SessionID], *pred)
	return nil
}

func (m *MemoryStore) GetMLPredictions(sessionID string) ([]models.MLPrediction, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.predictions[sessionID], nil
}

func (m *MemoryStore) SaveAIInsight(insight *models.AIInsight) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.insights[insight.SessionID] = append(m.insights[insight.SessionID], *insight)
	return nil
}

func (m *MemoryStore) GetAIInsights(sessionID string) ([]models.AIInsight, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.insights[sessionID], nil
}
