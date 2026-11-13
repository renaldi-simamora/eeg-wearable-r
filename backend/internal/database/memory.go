package database

import (
	"errors"
	"fmt"
	"log"
	"math"
	"math/rand"
	"sort"
	"strings"
	"sync"
	"time"

	"eeg-backend/models"

	"github.com/google/uuid"
)

type MemoryStore struct {
	mu                     sync.RWMutex
	users                  map[string]*models.User
	devices                map[string]*models.Device
	sessions               map[string]*models.Session
	eegSamples             map[string][]models.EEGSample
	brainwaves             map[string][]models.BrainwaveFeature
	predictions            map[string][]models.MLPrediction
	insights               map[string][]models.AIInsight
	mlJobs                 map[string]*models.MLClassificationJob
	simulateJobInsertError bool
}

func (m *MemoryStore) SetSimulateJobInsertError(simulate bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.simulateJobInsertError = simulate
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
		mlJobs:      make(map[string]*models.MLClassificationJob),
	}
	ms.seed()
	return ms
}

func (m *MemoryStore) seed() {
	now := time.Now()

	// Seed Laboratory Team Users across divisions
	t1 := now.Add(-2 * time.Hour)
	t2 := now.Add(-18 * time.Hour)
	t3 := now.Add(-36 * time.Hour)
	t4 := now.Add(-5 * 24 * time.Hour)

	initialUsers := []*models.User{
		{
			ID:           "user-demo-01",
			Username:     "superadmin",
			Name:         "Super Admin NeuroPulse",
			Email:        "admin@gmail.com",
			PasswordHash: "$2b$12$v8Ub2IyTcwHCrvKT79hWAOJcT.sZhlsBS5h60UqkkRE7yATnN16li", // admin123
			Role:         "superadmin",
			Division:     "IT & Telemetry",
			Position:     "Head of Platform & IT",
			Status:       "active",
			LastLogin:    &t1,
			Institution:  "IPB University",
			CreatedAt:    now.Add(-120 * 24 * time.Hour),
			UpdatedAt:    now,
		},
		{
			ID:           "user-admin-virza",
			Username:     "virzasiutaa",
			Name:         "Virza Siuta",
			Email:        "virzasiutaa@gmail.com",
			PasswordHash: "$2b$12$v8Ub2IyTcwHCrvKT79hWAOJcT.sZhlsBS5h60UqkkRE7yATnN16li", // admin123
			Role:         "admin",
			Division:     "Biomedical & Hardware",
			Position:     "Administrator",
			Status:       "active",
			LastLogin:    &t1,
			Institution:  "IPB University",
			CreatedAt:    now.Add(-30 * 24 * time.Hour),
			UpdatedAt:    now,
		},
		{
			ID:           "user-lab-02",
			Username:     "septi.a",
			Name:         "Septi Anggraini",
			Email:        "septi.tax@neuropulse.id",
			PasswordHash: "$2b$12$v8Ub2IyTcwHCrvKT79hWAOJcT.sZhlsBS5h60UqkkRE7yATnN16li",
			Role:         "head",
			Division:     "Clinical Research",
			Position:     "Head of Clinical Protocol",
			Status:       "active",
			LastLogin:    &t1,
			Institution:  "IPB University",
			CreatedAt:    now.Add(-60 * 24 * time.Hour),
			UpdatedAt:    now,
		},
		{
			ID:           "user-lab-03",
			Username:     "renaldi.s",
			Name:         "Renaldi Simamora",
			Email:        "renaldi.s@neuropulse.id",
			PasswordHash: "$2b$12$v8Ub2IyTcwHCrvKT79hWAOJcT.sZhlsBS5h60UqkkRE7yATnN16li",
			Role:         "engineer",
			Division:     "Biomedical & Hardware",
			Position:     "Lead Biomedical Engineer",
			Status:       "active",
			LastLogin:    &t2,
			Institution:  "IPB University",
			CreatedAt:    now.Add(-45 * 24 * time.Hour),
			UpdatedAt:    now,
		},
		{
			ID:           "user-lab-04",
			Username:     "budi.s",
			Name:         "Dr. Budi Santoso",
			Email:        "budi.santoso@neuropulse.id",
			PasswordHash: "$2b$12$v8Ub2IyTcwHCrvKT79hWAOJcT.sZhlsBS5h60UqkkRE7yATnN16li",
			Role:         "researcher",
			Division:     "AI & Signal Processing",
			Position:     "Lead Machine Learning Researcher",
			Status:       "active",
			LastLogin:    &t3,
			Institution:  "IPB University",
			CreatedAt:    now.Add(-30 * 24 * time.Hour),
			UpdatedAt:    now,
		},
		{
			ID:           "user-lab-05",
			Username:     "dina.p",
			Name:         "Dina Permatasari",
			Email:        "dina.p@neuropulse.id",
			PasswordHash: "$2b$12$v8Ub2IyTcwHCrvKT79hWAOJcT.sZhlsBS5h60UqkkRE7yATnN16li",
			Role:         "staff",
			Division:     "Clinical Research",
			Position:     "EEG Lab Technician",
			Status:       "active",
			LastLogin:    &t4,
			Institution:  "IPB University",
			CreatedAt:    now.Add(-20 * 24 * time.Hour),
			UpdatedAt:    now,
		},
		{
			ID:           "user-lab-06",
			Username:     "faisal.h",
			Name:         "Faisal Hakim",
			Email:        "faisal.h@neuropulse.id",
			PasswordHash: "$2b$12$v8Ub2IyTcwHCrvKT79hWAOJcT.sZhlsBS5h60UqkkRE7yATnN16li",
			Role:         "engineer",
			Division:     "Biomedical & Hardware",
			Position:     "Junior Hardware Associate",
			Status:       "inactive", // Sample inactive user
			LastLogin:    nil,
			Institution:  "IPB University",
			CreatedAt:    now.Add(-10 * 24 * time.Hour),
			UpdatedAt:    now,
		},
		{
			ID:           "user-lab-07",
			Username:     "tari.w",
			Name:         "Tari Wulandari",
			Email:        "tari.w@neuropulse.id",
			PasswordHash: "$2b$12$v8Ub2IyTcwHCrvKT79hWAOJcT.sZhlsBS5h60UqkkRE7yATnN16li",
			Role:         "staff",
			Division:     "GA & Laboratory Operations",
			Position:     "Lab Ethics & Compliance Officer",
			Status:       "active",
			LastLogin:    &t2,
			Institution:  "IPB University",
			CreatedAt:    now.Add(-15 * 24 * time.Hour),
			UpdatedAt:    now,
		},
	}

	for _, u := range initialUsers {
		m.users[u.ID] = u
	}

	// Seed Devices (5 devices representing 5 primary EEG band protocols)
	devices := []models.Device{
		{
			ID:              "dev-001",
			DeviceCode:      "EEG-001",
			Name:            "TGAM1 Wearable Headset Alpha",
			Status:          "connected",
			BatteryLevel:    88,
			SignalQuality:   nil,
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
			SignalQuality:   nil,
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
			SignalQuality:   nil,
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
			SignalQuality:   nil,
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
			SignalQuality:   nil,
			FirmwareVersion: "v1.2.0-esp32",
			LastSeen:        now,
			CreatedAt:       now.Add(-24 * time.Hour),
			UpdatedAt:       now,
		},
		{
			ID:              "esp32-eeg-gateway-01",
			DeviceCode:      "ESP32-HW-01",
			Name:            "ESP32 TGAM1 Hardware Gateway",
			Status:          "connected",
			BatteryLevel:    100,
			SignalQuality:   nil,
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
			ID:              "ses-001",
			UserID:          "user-demo-01",
			DeviceID:        "dev-001",
			ParticipantName: "Subject A-01",
			Title:           "Baseline Relaxed Alpha Recording",
			Notes:           "Closed-eyes resting condition measurement",
			AcquisitionMode: "simulated",
			StartedAt:       now.Add(-45 * time.Minute),
			EndedAt:         &s1Ended,
			Duration:        900,
			Status:          "completed",
			TargetBand:      "ALPHA",
			CreatedAt:       now.Add(-45 * time.Minute),
			DeviceName:      "TGAM1 Wearable Headset Alpha",
			DeviceCode:      "EEG-001",
			SignalQuality:   nil,
		},
		{
			ID:              "ses-002",
			UserID:          "user-demo-01",
			DeviceID:        "dev-002",
			ParticipantName: "Subject B-04",
			Title:           "Arithmetic Task Focus Session",
			Notes:           "Mental subtraction math task measurement",
			AcquisitionMode: "simulated",
			StartedAt:       now.Add(-140 * time.Minute),
			EndedAt:         &s2Ended,
			Duration:        1200,
			Status:          "completed",
			TargetBand:      "BETA",
			CreatedAt:       now.Add(-140 * time.Minute),
			DeviceName:      "TGAM1 Wearable Headset Beta",
			DeviceCode:      "EEG-002",
			SignalQuality:   nil,
		},
		{
			ID:              "ses-003",
			UserID:          "user-demo-01",
			DeviceID:        "dev-003",
			ParticipantName: "Subject C-12",
			Title:           "Gamma Synchrony Visual Task",
			Notes:           "High visual attention stimulus",
			AcquisitionMode: "simulated",
			StartedAt:       now.Add(-252 * time.Minute),
			EndedAt:         &s3Ended,
			Duration:        720,
			Status:          "completed",
			TargetBand:      "GAMMA",
			CreatedAt:       now.Add(-252 * time.Minute),
			DeviceName:      "TGAM1 Wearable Headset Gamma",
			DeviceCode:      "EEG-003",
			SignalQuality:   nil,
		},
		{
			ID:              "ses-004",
			UserID:          "user-demo-01",
			DeviceID:        "dev-004",
			ParticipantName: "Subject D-09",
			Title:           "Drowsiness & Slow Wave Session",
			Notes:           "Deep restful slow-wave monitoring",
			AcquisitionMode: "simulated",
			StartedAt:       now.Add(-385 * time.Minute),
			EndedAt:         &s4Ended,
			Duration:        1500,
			Status:          "completed",
			TargetBand:      "DELTA",
			CreatedAt:       now.Add(-385 * time.Minute),
			DeviceName:      "TGAM1 Wearable Headset Delta",
			DeviceCode:      "EEG-004",
			SignalQuality:   nil,
		},
		{
			ID:              "ses-005",
			UserID:          "user-demo-01",
			DeviceID:        "dev-005",
			ParticipantName: "Subject E-15",
			Title:           "Hypnagogic Theta Exploration",
			Notes:           "Meditative state monitoring",
			AcquisitionMode: "simulated",
			StartedAt:       now.Add(-498 * time.Minute),
			EndedAt:         &s5Ended,
			Duration:        1080,
			Status:          "completed",
			TargetBand:      "THETA",
			CreatedAt:       now.Add(-498 * time.Minute),
			DeviceName:      "TGAM1 Wearable Headset Theta",
			DeviceCode:      "EEG-005",
			SignalQuality:   nil,
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

			sqVal := 0
			if s.SignalQuality != nil {
				sqVal = *s.SignalQuality
			}
			samples[i] = models.EEGSample{
				ID:            fmt.Sprintf("s%d-%d", sIdx+1, i),
				SessionID:     s.ID,
				Timestamp:     s.StartedAt.UnixMilli() + int64(i*20),
				RawEEG:        math.Round(val*100) / 100,
				SignalQuality: sqVal,
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

func (m *MemoryStore) GetUsers() ([]models.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var list []models.User
	for _, u := range m.users {
		userCopy := *u
		if userCopy.Status == "" {
			userCopy.Status = "active"
		}
		if userCopy.Division == "" {
			userCopy.Division = "Biomedical & AI Lab"
		}
		if userCopy.Position == "" {
			userCopy.Position = "Researcher"
		}
		if userCopy.Username == "" {
			parts := strings.Split(userCopy.Email, "@")
			userCopy.Username = parts[0]
		}
		list = append(list, userCopy)
	}
	// Sort by creation time
	sort.Slice(list, func(i, j int) bool {
		return list[i].CreatedAt.Before(list[j].CreatedAt)
	})
	return list, nil
}

func (m *MemoryStore) UpdateUser(user *models.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if existing, ok := m.users[user.ID]; ok {
		existing.Name = user.Name
		existing.Institution = user.Institution
		if user.Division != "" {
			existing.Division = user.Division
		}
		if user.Position != "" {
			existing.Position = user.Position
		}
		existing.UpdatedAt = time.Now()
		return nil
	}
	return errors.New("user not found")
}

func (m *MemoryStore) UpdateUserStatus(id string, status string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if existing, ok := m.users[id]; ok {
		existing.Status = status
		existing.UpdatedAt = time.Now()
		return nil
	}
	return errors.New("user not found")
}

func (m *MemoryStore) ResetUserPassword(id string, passwordHash string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if existing, ok := m.users[id]; ok {
		existing.PasswordHash = passwordHash
		existing.UpdatedAt = time.Now()
		return nil
	}
	return errors.New("user not found")
}

func (m *MemoryStore) UpdateUserLastLogin(id string, lastLogin time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if existing, ok := m.users[id]; ok {
		existing.LastLogin = &lastLogin
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
	d.SignalQualityUpdatedAt = device.SignalQualityUpdatedAt
	d.UpdatedAt = time.Now()
	d.LastSeen = device.LastSeen
	d.LastEEGStreamAt = device.LastEEGStreamAt
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

func (m *MemoryStore) GetActiveSessionByDevice(deviceID string) (*models.Session, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var latest *models.Session
	for _, s := range m.sessions {
		if s.DeviceID == deviceID && (s.Status == "running" || s.Status == "stop_requested") {
			if latest == nil || s.StartedAt.After(latest.StartedAt) {
				latest = s
			}
		}
	}
	if latest == nil {
		return nil, nil
	}
	sesCopy := *latest
	if dev, ok := m.devices[latest.DeviceID]; ok {
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
	if session.ParticipantName == "" {
		session.ParticipantName = "Anonymous Subject"
	}
	if session.Title == "" {
		session.Title = "EEG Recording Session"
	}
	if session.AcquisitionMode == "" {
		session.AcquisitionMode = "simulated"
	}
	m.sessions[session.ID] = session
	return nil
}

func (m *MemoryStore) UpdateSession(session *models.Session) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, ok := m.sessions[session.ID]
	if !ok {
		return fmt.Errorf("session not found")
	}
	if session.ParticipantName != "" {
		s.ParticipantName = session.ParticipantName
	}
	if session.Title != "" {
		s.Title = session.Title
	}
	if session.Notes != "" {
		s.Notes = session.Notes
	}
	return nil
}

func (m *MemoryStore) RequestStopSession(id string) (*models.Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, ok := m.sessions[id]
	if !ok {
		return nil, fmt.Errorf("session not found")
	}

	// Idempotent: If already completed, keep completed
	if s.Status == "completed" {
		sesCopy := *s
		if dev, ok := m.devices[s.DeviceID]; ok {
			sesCopy.DeviceName = dev.Name
			sesCopy.DeviceCode = dev.DeviceCode
			sesCopy.SignalQuality = dev.SignalQuality
		}
		return &sesCopy, nil
	}

	// Idempotent: If already in stop_requested, preserve existing timestamp and return as-is
	if s.Status == "stop_requested" {
		sesCopy := *s
		if dev, ok := m.devices[s.DeviceID]; ok {
			sesCopy.DeviceName = dev.Name
			sesCopy.DeviceCode = dev.DeviceCode
			sesCopy.SignalQuality = dev.SignalQuality
		}
		return &sesCopy, nil
	}

	now := time.Now()
	s.EndedAt = &now
	s.Duration = int(now.Sub(s.StartedAt).Seconds())
	if s.Duration < 0 {
		s.Duration = 0
	}
	s.Status = "stop_requested"

	sesCopy := *s
	if dev, ok := m.devices[s.DeviceID]; ok {
		sesCopy.DeviceName = dev.Name
		sesCopy.DeviceCode = dev.DeviceCode
		sesCopy.SignalQuality = dev.SignalQuality
	}
	return &sesCopy, nil
}

func (m *MemoryStore) FinalizeSessionWithJob(id string) (*models.Session, *models.MLClassificationJob, bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, ok := m.sessions[id]
	if !ok {
		return nil, nil, false, fmt.Errorf("session not found")
	}

	// Idempotent: If already completed or cancelled, no state transition occurs
	if s.Status == "completed" || s.Status == "cancelled" {
		sesCopy := *s
		if dev, ok := m.devices[s.DeviceID]; ok {
			sesCopy.DeviceName = dev.Name
			sesCopy.DeviceCode = dev.DeviceCode
			sesCopy.SignalQuality = dev.SignalQuality
		}
		var existingJob *models.MLClassificationJob
		for _, j := range m.mlJobs {
			if j.SessionID == id {
				existingJob = j
				break
			}
		}
		return &sesCopy, existingJob, false, nil
	}

	oldStatus := s.Status
	oldEndedAt := s.EndedAt
	oldDuration := s.Duration

	now := time.Now()
	if s.EndedAt == nil {
		s.EndedAt = &now
		s.Duration = int(now.Sub(s.StartedAt).Seconds())
		if s.Duration < 0 {
			s.Duration = 0
		}
	}
	s.Status = "completed"

	// Simulate rollback if flag is set for test
	if m.simulateJobInsertError {
		s.Status = oldStatus
		s.EndedAt = oldEndedAt
		s.Duration = oldDuration
		return nil, nil, false, errors.New("simulated job creation failure for atomic rollback test")
	}

	// Create ML Job in the same atomic lock
	job := &models.MLClassificationJob{
		ID:          uuid.New().String(),
		SessionID:   id,
		Status:      "pending",
		Attempts:    0,
		MaxAttempts: 3,
		NextRunAt:   now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	jobCreated := true
	for _, existing := range m.mlJobs {
		if existing.SessionID == id {
			job = existing
			jobCreated = false
			break
		}
	}
	if jobCreated {
		m.mlJobs[job.ID] = job
	}

	sesCopy := *s
	if dev, ok := m.devices[s.DeviceID]; ok {
		sesCopy.DeviceName = dev.Name
		sesCopy.DeviceCode = dev.DeviceCode
		sesCopy.SignalQuality = dev.SignalQuality
	}
	return &sesCopy, job, true, nil
}

func (m *MemoryStore) FinalizeSession(id string) (*models.Session, bool, error) {
	ses, _, transitioned, err := m.FinalizeSessionWithJob(id)
	return ses, transitioned, err
}

func (m *MemoryStore) StopSession(id string) (*models.Session, error) {
	ses, _, err := m.FinalizeSession(id)
	return ses, err
}

func (m *MemoryStore) RecoverStaleStopRequestedSessions(cutoffDuration time.Duration) ([]models.Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	cutoffTime := now.Add(-cutoffDuration)
	var recovered []models.Session

	for _, s := range m.sessions {
		if s.Status == "stop_requested" {
			refTime := s.StartedAt
			if s.EndedAt != nil {
				refTime = *s.EndedAt
			}
			// Strict filter: only recover sessions whose age is strictly past the cutoff threshold
			if refTime.Before(cutoffTime) || refTime.Equal(cutoffTime) {
				s.Status = "completed"
				if s.EndedAt == nil {
					s.EndedAt = &now
					s.Duration = int(now.Sub(s.StartedAt).Seconds())
					if s.Duration < 0 {
						s.Duration = 0
					}
				}

				// Enqueue ML Job in the same atomic operation
				job := &models.MLClassificationJob{
					ID:          uuid.New().String(),
					SessionID:   s.ID,
					Status:      "pending",
					Attempts:    0,
					MaxAttempts: 3,
					NextRunAt:   now,
					CreatedAt:   now,
					UpdatedAt:   now,
				}
				jobExists := false
				for _, existing := range m.mlJobs {
					if existing.SessionID == s.ID {
						jobExists = true
						break
					}
				}
				if !jobExists {
					m.mlJobs[job.ID] = job
				}

				sesCopy := *s
				if dev, ok := m.devices[s.DeviceID]; ok {
					sesCopy.DeviceName = dev.Name
					sesCopy.DeviceCode = dev.DeviceCode
					sesCopy.SignalQuality = dev.SignalQuality
				}
				recovered = append(recovered, sesCopy)
			}
		}
	}
	return recovered, nil
}

func (m *MemoryStore) ReconcileCompletedSessionsWithoutJobs() ([]models.MLClassificationJob, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	var createdJobs []models.MLClassificationJob
	now := time.Now()

	for _, ses := range m.sessions {
		if ses.Status != "completed" {
			continue
		}

		// Check if predictions already exist
		if len(m.predictions[ses.ID]) > 0 {
			continue
		}

		// Check if job already exists
		hasJob := false
		for _, j := range m.mlJobs {
			if j.SessionID == ses.ID {
				hasJob = true
				break
			}
		}
		if hasJob {
			continue
		}

		// Check if eligible (features or samples exist)
		hasData := len(m.brainwaves[ses.ID]) > 0 || len(m.eegSamples[ses.ID]) > 0
		if !hasData {
			continue
		}

		job := &models.MLClassificationJob{
			ID:          uuid.New().String(),
			SessionID:   ses.ID,
			Status:      "pending",
			Attempts:    0,
			MaxAttempts: 3,
			NextRunAt:   now,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		m.mlJobs[job.ID] = job
		createdJobs = append(createdJobs, *job)
		log.Printf("[RECONCILIATION] Created missing ML job %s for completed session %s", job.ID, ses.ID)
	}

	return createdJobs, nil
}

func (m *MemoryStore) SaveEEGSamples(samples []models.EEGSample) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(samples) == 0 {
		return nil
	}
	sessID := samples[0].SessionID
	existingMap := make(map[string]bool)
	for _, existingSample := range m.eegSamples[sessID] {
		if existingSample.ID != "" {
			existingMap[existingSample.ID] = true
		}
	}
	for _, sample := range samples {
		if sample.ID != "" && existingMap[sample.ID] {
			continue // Deduplicate on retry
		}
		m.eegSamples[sessID] = append(m.eegSamples[sessID], sample)
		if sample.ID != "" {
			existingMap[sample.ID] = true
		}
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
	for i, existing := range m.brainwaves[feature.SessionID] {
		if existing.ID != "" && existing.ID == feature.ID {
			m.brainwaves[feature.SessionID][i] = *feature
			return nil
		}
	}
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

// CreateMLJob registers a durable ML classification job (idempotent per session)
func (m *MemoryStore) CreateMLJob(job *models.MLClassificationJob) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Unique constraint per session_id (ON CONFLICT DO NOTHING)
	for _, existing := range m.mlJobs {
		if existing.SessionID == job.SessionID {
			return nil
		}
	}

	jobCopy := *job
	if jobCopy.Status == "" {
		jobCopy.Status = "pending"
	}
	if jobCopy.MaxAttempts <= 0 {
		jobCopy.MaxAttempts = 3
	}
	if jobCopy.CreatedAt.IsZero() {
		jobCopy.CreatedAt = time.Now()
	}
	if jobCopy.UpdatedAt.IsZero() {
		jobCopy.UpdatedAt = jobCopy.CreatedAt
	}
	if jobCopy.NextRunAt.IsZero() {
		jobCopy.NextRunAt = jobCopy.CreatedAt
	}

	m.mlJobs[jobCopy.ID] = &jobCopy
	return nil
}

// GetMLJobBySessionID returns the ML classification job for the given session ID
func (m *MemoryStore) GetMLJobBySessionID(sessionID string) (*models.MLClassificationJob, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, j := range m.mlJobs {
		if j.SessionID == sessionID {
			copyJob := *j
			return &copyJob, nil
		}
	}
	return nil, nil
}

// ClaimNextPendingMLJobs atomically claims pending jobs for processing up to limit
func (m *MemoryStore) ClaimNextPendingMLJobs(limit int) ([]models.MLClassificationJob, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if limit <= 0 {
		limit = 10
	}

	now := time.Now()
	var claimed []models.MLClassificationJob

	for _, j := range m.mlJobs {
		if len(claimed) >= limit {
			break
		}

		isPending := j.Status == "pending"
		isStaleProcessing := j.Status == "processing" && now.Sub(j.UpdatedAt) > 5*time.Minute

		if (isPending || isStaleProcessing) && (j.NextRunAt.Before(now) || j.NextRunAt.Equal(now)) && j.Attempts < j.MaxAttempts {
			j.Status = "processing"
			j.Attempts++
			j.UpdatedAt = now
			claimed = append(claimed, *j)
		}
	}

	return claimed, nil
}

// UpdateMLJob updates an existing ML job
func (m *MemoryStore) UpdateMLJob(job *models.MLClassificationJob) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	existing, exists := m.mlJobs[job.ID]
	if !exists {
		return errors.New("job not found")
	}

	jobCopy := *job
	jobCopy.UpdatedAt = time.Now()
	*existing = jobCopy
	return nil
}

// Close is a no-op for in-memory store
func (m *MemoryStore) Close() error {
	return nil
}
