package eeg_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"eeg-backend/config"
	"eeg-backend/internal/database"
	"eeg-backend/internal/eeg"
	"eeg-backend/internal/middleware"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/models"
	"eeg-backend/routes"
)

func intPtr(i int) *int { return &i }

func TestDeviceStartSessionService(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	eegService := eeg.NewService(memStore, hub)

	sessionID := "test-device-session-001"
	deviceID := "esp32-eeg-gateway-01"

	req := &models.DeviceSessionStartRequest{
		SessionID:          sessionID,
		DeviceID:           deviceID,
		MaxDurationSeconds: 7200,
		Format:             "thinkgear_raw_eeg",
		SamplingRateHz:     512,
		ChannelCount:       1,
		LeadLocation:       "FP1",
		Status:             "started",
		TargetBand:         "BETA",
	}

	// 1. First registration call
	ses, err := eegService.StartDeviceSession(req)
	if err != nil {
		t.Fatalf("StartDeviceSession failed: %v", err)
	}

	if ses.ID != sessionID {
		t.Errorf("Expected session ID %s, got %s", sessionID, ses.ID)
	}
	if ses.Status != "running" {
		t.Errorf("Expected status 'running', got %s", ses.Status)
	}
	if ses.TargetBand != "BETA" {
		t.Errorf("Expected TargetBand 'BETA', got %s", ses.TargetBand)
	}

	// Device check
	dev, err := memStore.GetDeviceByID(deviceID)
	if err != nil || dev == nil {
		t.Fatalf("Expected device %s to be created and connected, got nil: %v", deviceID, err)
	}
	if dev.Status != "connected" {
		t.Errorf("Expected device status 'connected', got %s", dev.Status)
	}

	// 2. Idempotent retry: start same session again
	ses2, err := eegService.StartDeviceSession(req)
	if err != nil {
		t.Fatalf("StartDeviceSession retry failed: %v", err)
	}
	if ses2.ID != sessionID {
		t.Errorf("Expected session ID %s on retry, got %s", sessionID, ses2.ID)
	}
}

func TestDeviceBatchIngestionAndIdempotency(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	eegService := eeg.NewService(memStore, hub)

	sessionID := "test-ingest-session-002"
	deviceID := "esp32-eeg-gateway-01"

	// Start session
	_, err := eegService.StartDeviceSession(&models.DeviceSessionStartRequest{
		SessionID: sessionID,
		DeviceID:  deviceID,
	})
	if err != nil {
		t.Fatalf("StartDeviceSession failed: %v", err)
	}

	rawSamples := []int16{100, -50, 0, 200, -100}
	batchReq := &models.DeviceBatchSamplesRequest{
		SessionID:     sessionID,
		DeviceID:      deviceID,
		StartIndex:    0,
		Format:        "thinkgear_raw_eeg",
		SampleCount:   len(rawSamples),
		SignalQuality: intPtr(0), // Good contact
		BandPower: &models.DeviceBandPower{
			Delta:     100000,
			Theta:     150000,
			LowAlpha:  200000,
			HighAlpha: 200000,
			LowBeta:   150000,
			HighBeta:  100000,
			LowGamma:  50000,
			MidGamma:  50000,
		},
		Samples: rawSamples,
	}

	// 1. Ingest batch
	count, err := eegService.IngestDeviceBatch(batchReq)
	if err != nil {
		t.Fatalf("IngestDeviceBatch failed: %v", err)
	}
	if count != len(rawSamples) {
		t.Errorf("Expected %d samples ingested, got %d", len(rawSamples), count)
	}

	// 2. Verify samples stored
	storedSamples, err := memStore.GetEEGSamples(sessionID)
	if err != nil {
		t.Fatalf("Failed to fetch stored samples: %v", err)
	}
	if len(storedSamples) != len(rawSamples) {
		t.Fatalf("Expected %d stored samples, got %d", len(rawSamples), len(storedSamples))
	}

	// 3. Verify ThinkGear ADC to microvolt conversion:
	// V = (100 * (1.8 / 4096) / 2000) * 1e6 = 100 * 0.2197265625 = 21.97265625 uV
	expectedUV0 := math.Round(((float64(rawSamples[0])*(1.8/4096.0)/2000.0)*1000000.0)*100) / 100
	if math.Abs(storedSamples[0].RawEEG-expectedUV0) > 0.01 {
		t.Errorf("Expected microvolts %.2f, got %.2f", expectedUV0, storedSamples[0].RawEEG)
	}

	// 4. Verify Band Power normalization (sums to 100%)
	features, err := memStore.GetBrainwaveFeatures(sessionID)
	if err != nil || len(features) != 1 {
		t.Fatalf("Expected 1 brainwave feature record, got %d (err: %v)", len(features), err)
	}
	feat := features[0]
	// Sub-band aggregation:
	// Delta = 100,000, Theta = 150,000, Alpha = 400,000, Beta = 250,000, Gamma = 100,000
	// Total = 1,000,000
	// Relative %: Delta=10%, Theta=15%, Alpha=40%, Beta=25%, Gamma=10%
	if math.Abs(feat.Delta-10.0) > 0.1 {
		t.Errorf("Expected Delta ~10%%, got %.2f%%", feat.Delta)
	}
	if math.Abs(feat.Theta-15.0) > 0.1 {
		t.Errorf("Expected Theta ~15%%, got %.2f%%", feat.Theta)
	}
	if math.Abs(feat.Alpha-40.0) > 0.1 {
		t.Errorf("Expected Alpha ~40%%, got %.2f%%", feat.Alpha)
	}
	if math.Abs(feat.Beta-25.0) > 0.1 {
		t.Errorf("Expected Beta ~25%%, got %.2f%%", feat.Beta)
	}
	if math.Abs(feat.Gamma-10.0) > 0.1 {
		t.Errorf("Expected Gamma ~10%%, got %.2f%%", feat.Gamma)
	}
	sumPct := feat.Delta + feat.Theta + feat.Alpha + feat.Beta + feat.Gamma
	if math.Abs(sumPct-100.0) > 0.2 {
		t.Errorf("Expected relative powers to sum to 100%%, got %.2f%%", sumPct)
	}

	// 5. Test idempotency: Ingest the exact same batch again (simulating network timeout retry)
	countRetry, err := eegService.IngestDeviceBatch(batchReq)
	if err != nil {
		t.Fatalf("Ingest retry returned unexpected error: %v", err)
	}
	if countRetry != len(rawSamples) {
		t.Errorf("Expected %d, got %d", len(rawSamples), countRetry)
	}

	// Samples count in DB MUST REMAIN EXACTLY 5 (no duplicates!)
	storedAfterRetry, err := memStore.GetEEGSamples(sessionID)
	if err != nil {
		t.Fatalf("Failed to fetch stored samples after retry: %v", err)
	}
	if len(storedAfterRetry) != len(rawSamples) {
		t.Fatalf("Idempotency violation! Expected %d samples after retry, but got %d", len(rawSamples), len(storedAfterRetry))
	}

	// Features count MUST REMAIN 1
	featuresAfterRetry, _ := memStore.GetBrainwaveFeatures(sessionID)
	if len(featuresAfterRetry) != 1 {
		t.Fatalf("Idempotency violation! Expected 1 feature after retry, but got %d", len(featuresAfterRetry))
	}
}

func TestDeviceFinishSessionService(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	eegService := eeg.NewService(memStore, hub)

	sessionID := "test-finish-session-003"
	deviceID := "esp32-eeg-gateway-01"

	_, _ = eegService.StartDeviceSession(&models.DeviceSessionStartRequest{
		SessionID: sessionID,
		DeviceID:  deviceID,
	})

	time.Sleep(10 * time.Millisecond)

	ses, err := eegService.FinishDeviceSession(&models.DeviceSessionFinishRequest{
		SessionID:       sessionID,
		DeviceID:        deviceID,
		DurationSeconds: 45,
		TotalSamples:    23040,
		ValidPackets:    23040,
		InvalidPackets:  0,
		Status:          "completed",
		Reason:          "button",
	})
	if err != nil {
		t.Fatalf("FinishDeviceSession failed: %v", err)
	}

	if ses.Status != "completed" {
		t.Errorf("Expected status 'completed', got %s", ses.Status)
	}
	if ses.Duration != 45 {
		t.Errorf("Expected duration 45, got %d", ses.Duration)
	}
}

func TestDeviceEndpointsHTTPRoutes(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	cfg := &config.Config{
		JWTSecret:    "test-jwt-secret-academic",
		DeviceAPIKey: "eeg-device-secret-key-academic-2026",
		CORSOrigin:   "*",
	}

	router := routes.SetupRouter(cfg, memStore, hub)
	apiKey := "eeg-device-secret-key-academic-2026"
	sessionID := "http-test-session-004"

	// 1. Test POST /api/v1/eeg/sessions/start with valid API key
	startBody, _ := json.Marshal(models.DeviceSessionStartRequest{
		SessionID: sessionID,
		DeviceID:  "esp32-eeg-gateway-01",
	})
	reqStart, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/sessions/start", bytes.NewBuffer(startBody))
	reqStart.Header.Set("Content-Type", "application/json")
	reqStart.Header.Set("X-Device-API-Key", apiKey)

	wStart := httptest.NewRecorder()
	router.ServeHTTP(wStart, reqStart)

	if wStart.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 for session start, got %d: %s", wStart.Code, wStart.Body.String())
	}

	// 2. Test unauthorized without API key
	reqUnauth, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/sessions/start", bytes.NewBuffer(startBody))
	reqUnauth.Header.Set("Content-Type", "application/json")
	wUnauth := httptest.NewRecorder()
	router.ServeHTTP(wUnauth, reqUnauth)

	if wUnauth.Code != http.StatusUnauthorized {
		t.Errorf("Expected HTTP 401 without API key, got %d", wUnauth.Code)
	}

	// 3. Test POST /api/v1/eeg/samples with valid API key
	sampleBody, _ := json.Marshal(models.DeviceBatchSamplesRequest{
		SessionID:     sessionID,
		DeviceID:      "esp32-eeg-gateway-01",
		StartIndex:    0,
		Format:        "thinkgear_raw_eeg",
		SampleCount:   3,
		SignalQuality: intPtr(0),
		Samples:       []int16{12, -4, 88},
	})
	reqSamples, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/samples", bytes.NewBuffer(sampleBody))
	reqSamples.Header.Set("Content-Type", "application/json")
	reqSamples.Header.Set("X-Device-API-Key", apiKey)

	wSamples := httptest.NewRecorder()
	router.ServeHTTP(wSamples, reqSamples)

	if wSamples.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 for sample ingestion, got %d: %s", wSamples.Code, wSamples.Body.String())
	}

	// 4. Test alias routes without /api (/v1/eeg/samples) while session is active
	reqAlias, _ := http.NewRequest(http.MethodPost, "/v1/eeg/samples", bytes.NewBuffer(sampleBody))
	reqAlias.Header.Set("Content-Type", "application/json")
	reqAlias.Header.Set("X-Device-API-Key", apiKey)

	wAlias := httptest.NewRecorder()
	router.ServeHTTP(wAlias, reqAlias)

	if wAlias.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 on /v1/eeg/samples alias, got %d: %s", wAlias.Code, wAlias.Body.String())
	}

	// 5. Test POST /api/v1/eeg/sessions/finish with valid API key
	finishBody, _ := json.Marshal(models.DeviceSessionFinishRequest{
		SessionID:       sessionID,
		DeviceID:        "esp32-eeg-gateway-01",
		DurationSeconds: 15,
		TotalSamples:    7680,
		Status:          "completed",
	})
	reqFinish, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/sessions/finish", bytes.NewBuffer(finishBody))
	reqFinish.Header.Set("Content-Type", "application/json")
	reqFinish.Header.Set("X-Device-API-Key", apiKey)

	wFinish := httptest.NewRecorder()
	router.ServeHTTP(wFinish, reqFinish)

	if wFinish.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 for session finish, got %d: %s", wFinish.Code, wFinish.Body.String())
	}
}

func TestPostgresDeviceIngestion(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:*101Abc_@localhost:5432/eeg_db?sslmode=disable"
	}

	pgStore, err := database.NewPostgresStore(dbURL)
	if err != nil {
		t.Skipf("Skipping live Postgres test: database connection error: %v", err)
	}

	hub := ws.NewHub()
	eegService := eeg.NewService(pgStore, hub)

	sessionID := "pg-test-" + time.Now().Format("20060102150405")
	deviceID := "esp32-eeg-gateway-01"

	// 1. Ensure user-demo-01 exists for foreign key constraint in sessions table
	demoUser, _ := pgStore.GetUserByID("user-demo-01")
	if demoUser == nil {
		_ = pgStore.CreateUser(&models.User{
			ID:           "user-demo-01",
			Name:         "Lead EEG Researcher",
			Email:        "researcher@neuropulse.lab",
			PasswordHash: "hashed",
			Role:         "researcher",
			Institution:  "NeuroPulse Research",
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		})
	}

	// 2. Start session
	ses, err := eegService.StartDeviceSession(&models.DeviceSessionStartRequest{
		SessionID:  sessionID,
		DeviceID:   deviceID,
		TargetBand: "ALPHA",
	})
	if err != nil {
		t.Fatalf("StartDeviceSession on Postgres failed: %v", err)
	}
	if ses.ID != sessionID {
		t.Errorf("Expected session ID %s, got %s", sessionID, ses.ID)
	}

	// 3. Ingest batch of samples
	rawSamples := []int16{250, -180, 45, 0}
	batchReq := &models.DeviceBatchSamplesRequest{
		SessionID:     sessionID,
		DeviceID:      deviceID,
		StartIndex:    0,
		Format:        "thinkgear_raw_eeg",
		SampleCount:   len(rawSamples),
		SignalQuality: intPtr(0),
		BandPower: &models.DeviceBandPower{
			Delta: 50000,
			Theta: 100000,
			Alpha: 500000,
			Beta:  250000,
			Gamma: 100000,
		},
		Samples: rawSamples,
	}

	count, err := eegService.IngestDeviceBatch(batchReq)
	if err != nil {
		t.Fatalf("IngestDeviceBatch on Postgres failed: %v", err)
	}
	if count != len(rawSamples) {
		t.Errorf("Expected %d, got %d", len(rawSamples), count)
	}

	// 4. Query samples from PostgreSQL directly to verify persistence
	samples, err := pgStore.GetEEGSamples(sessionID)
	if err != nil {
		t.Fatalf("GetEEGSamples on Postgres failed: %v", err)
	}
	if len(samples) != len(rawSamples) {
		t.Fatalf("Expected %d samples in Postgres, got %d", len(rawSamples), len(samples))
	}

	// 5. Test ON CONFLICT (id) DO NOTHING idempotency on PostgreSQL
	countRetry, err := eegService.IngestDeviceBatch(batchReq)
	if err != nil {
		t.Fatalf("Ingest retry on Postgres returned error: %v", err)
	}
	if countRetry != len(rawSamples) {
		t.Errorf("Expected %d on retry, got %d", len(rawSamples), countRetry)
	}

	samplesAfterRetry, _ := pgStore.GetEEGSamples(sessionID)
	if len(samplesAfterRetry) != len(rawSamples) {
		t.Fatalf("PostgreSQL idempotency failure! Expected %d samples after duplicate POST, got %d", len(rawSamples), len(samplesAfterRetry))
	}

	// 6. Finish session
	sesFinish, err := eegService.FinishDeviceSession(&models.DeviceSessionFinishRequest{
		SessionID:       sessionID,
		DeviceID:        deviceID,
		DurationSeconds: 10,
		TotalSamples:    uint32(len(rawSamples)),
		Status:          "completed",
	})
	if err != nil {
		t.Fatalf("FinishDeviceSession on Postgres failed: %v", err)
	}
	if sesFinish.Status != "completed" {
		t.Errorf("Expected completed status in Postgres, got %s", sesFinish.Status)
	}
}

// Mock store that simulates a DB write failure on SaveEEGSamples
type failingSaveStore struct {
	*database.MemoryStore
}

func (f *failingSaveStore) SaveEEGSamples(samples []models.EEGSample) error {
	return errors.New("simulated database write failure for testing atomic integrity")
}

func TestEmptyBandPowerRejected(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	eegService := eeg.NewService(memStore, hub)

	sessionID := "test-empty-bp"
	deviceID := "esp32-eeg-gateway-01"

	_, err := eegService.StartDeviceSession(&models.DeviceSessionStartRequest{
		SessionID: sessionID,
		DeviceID:  deviceID,
	})
	if err != nil {
		t.Fatalf("StartDeviceSession failed: %v", err)
	}

	// Payload with empty BandPower object and no samples
	batchReq := &models.DeviceBatchSamplesRequest{
		SessionID:     sessionID,
		DeviceID:      deviceID,
		StartIndex:    0,
		Format:        "thinkgear_raw_eeg",
		SampleCount:   0,
		SignalQuality: intPtr(0),
		BandPower:     &models.DeviceBandPower{}, // all 0 values
		Samples:       []int16{},
	}

	_, err = eegService.IngestDeviceBatch(batchReq)
	if err == nil {
		t.Fatal("Expected error for empty/all-zero BandPower with empty samples, got nil")
	}
}

func TestInvalidBandPowerAllZeroRejected(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	eegService := eeg.NewService(memStore, hub)

	sessionID := "test-zero-bp"
	deviceID := "esp32-eeg-gateway-01"

	_, err := eegService.StartDeviceSession(&models.DeviceSessionStartRequest{
		SessionID: sessionID,
		DeviceID:  deviceID,
	})
	if err != nil {
		t.Fatalf("StartDeviceSession failed: %v", err)
	}

	batchReq := &models.DeviceBatchSamplesRequest{
		SessionID:     sessionID,
		DeviceID:      deviceID,
		StartIndex:    0,
		Format:        "thinkgear_raw_eeg",
		SampleCount:   0,
		SignalQuality: intPtr(0),
		BandPower: &models.DeviceBandPower{
			Delta: 0,
			Theta: 0,
			Alpha: 0,
		},
		Samples: nil,
	}

	_, err = eegService.IngestDeviceBatch(batchReq)
	if err == nil {
		t.Fatal("Expected error for all-zero BandPower without samples, got nil")
	}
}

func TestUserJWTCannotAccessHardwareEndpoint(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	cfg := &config.Config{
		JWTSecret:    "test-jwt-secret-academic",
		DeviceAPIKey: "eeg-device-secret-key-academic-2026",
		CORSOrigin:   "*",
	}

	router := routes.SetupRouter(cfg, memStore, hub)

	// Create user JWT token
	userToken, err := middleware.GenerateToken(&models.User{
		ID:    "user-demo-01",
		Email: "researcher@neuropulse.lab",
		Role:  "researcher",
	}, cfg.JWTSecret)
	if err != nil {
		t.Fatalf("Failed to generate user token: %v", err)
	}

	sampleBody, _ := json.Marshal(models.DeviceBatchSamplesRequest{
		SessionID:     "test-sess-jwt",
		DeviceID:      "esp32-eeg-gateway-01",
		StartIndex:    0,
		Format:        "thinkgear_raw_eeg",
		SampleCount:   1,
		SignalQuality: intPtr(0),
		Samples:       []int16{100},
	})

	// Make request with User JWT but NO X-Device-API-Key
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/samples", bytes.NewBuffer(sampleBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+userToken)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("Expected HTTP 401 Unauthorized when accessing hardware route with User JWT, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSimulatedIngestionDoesNotUpdateHardwareLastEEGStreamAt(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	eegService := eeg.NewService(memStore, hub)

	sessionID := "test-sim-vs-hw-sess"
	// Create session linked to physical hardware gateway ID
	ses := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        "esp32-eeg-gateway-01",
		ParticipantName: "Subject Test",
		Title:           "Simulated Ingestion Safety Test",
		AcquisitionMode: "simulated",
		StartedAt:       time.Now(),
		Status:          "running",
	}
	_ = memStore.CreateSession(ses)

	// Ingest via simulator route (SaveEEGData)
	err := eegService.SaveEEGData(&models.PostEEGDataRequest{
		SessionID: sessionID,
		Samples: []models.EEGSample{
			{Timestamp: time.Now().UnixMilli(), RawEEG: 25.0, SignalQuality: 0},
		},
		Features: &models.BrainwaveFeature{
			Alpha: 50.0,
		},
	})
	if err != nil {
		t.Fatalf("SaveEEGData failed: %v", err)
	}

	// Verify that physical hardware gateway LastEEGStreamAt was NOT touched
	hwDev, err := memStore.GetDeviceByID("esp32-eeg-gateway-01")
	if err != nil {
		t.Fatalf("Failed to get hardware device: %v", err)
	}
	if hwDev.LastEEGStreamAt != nil {
		t.Errorf("Academic Integrity Violation! Simulator ingestion updated LastEEGStreamAt of physical hardware gateway: %v", hwDev.LastEEGStreamAt)
	}
}

func TestDBSaveFailureDoesNotUpdateLastEEGStreamAt(t *testing.T) {
	baseMem := database.NewMemoryStore()
	failingStore := &failingSaveStore{MemoryStore: baseMem}
	hub := ws.NewHub()
	eegService := eeg.NewService(failingStore, hub)

	sessionID := "test-db-fail-session"
	deviceID := "esp32-eeg-gateway-01"

	_, err := eegService.StartDeviceSession(&models.DeviceSessionStartRequest{
		SessionID: sessionID,
		DeviceID:  deviceID,
	})
	if err != nil {
		t.Fatalf("StartDeviceSession failed: %v", err)
	}

	hwDevBefore, _ := failingStore.GetDeviceByID(deviceID)
	if hwDevBefore.LastEEGStreamAt != nil {
		t.Fatalf("Pre-condition failed: LastEEGStreamAt must be nil before stream")
	}

	// Ingest batch - SaveEEGSamples will fail
	batchReq := &models.DeviceBatchSamplesRequest{
		SessionID:     sessionID,
		DeviceID:      deviceID,
		StartIndex:    0,
		Format:        "thinkgear_raw_eeg",
		SampleCount:   2,
		SignalQuality: intPtr(0),
		Samples:       []int16{15, 25},
	}

	_, err = eegService.IngestDeviceBatch(batchReq)
	if err == nil {
		t.Fatalf("Expected IngestDeviceBatch to fail due to DB write failure, got nil")
	}

	// Verify that LastEEGStreamAt and SignalQuality were NOT updated on DB failure
	hwDevAfter, _ := failingStore.GetDeviceByID(deviceID)
	if hwDevAfter.LastEEGStreamAt != nil {
		t.Errorf("Atomic ordering violation: LastEEGStreamAt was updated even though DB save failed: %v", hwDevAfter.LastEEGStreamAt)
	}
	if hwDevAfter.SignalQuality != nil {
		t.Errorf("Atomic ordering violation: SignalQuality was updated even though DB save failed: %v", hwDevAfter.SignalQuality)
	}
}
