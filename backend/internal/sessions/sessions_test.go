package sessions_test

import (
	"math"
	"os"
	"testing"
	"time"

	"eeg-backend/internal/database"
	"eeg-backend/internal/sessions"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/models"
)

func TestSessionLifecycle(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	sessionService := sessions.NewService(memStore, hub, nil)

	// 1. Create Session with existing device (dev-001 seeded in memStore)
	createReq := &models.CreateSessionRequest{
		DeviceID: "dev-001",
	}

	ses, err := sessionService.Create("test-user-id", createReq)
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	if ses.ID == "" {
		t.Errorf("Expected non-empty session ID")
	}
	if ses.Status != "running" {
		t.Errorf("Expected session status 'running', got %s", ses.Status)
	}
	if ses.DeviceID != "dev-001" {
		t.Errorf("Expected device ID 'dev-001', got %s", ses.DeviceID)
	}

	// 2. Retrieve Session by ID
	fetched, err := sessionService.GetByID(ses.ID)
	if err != nil || fetched == nil {
		t.Fatalf("Failed to get session by ID: %v", err)
	}
	if fetched.ID != ses.ID {
		t.Errorf("Expected session ID %s, got %s", ses.ID, fetched.ID)
	}

	// 3. Stop Session
	stopped, err := sessionService.Stop(ses.ID)
	if err != nil {
		t.Fatalf("Failed to stop session: %v", err)
	}
	if stopped.Status != "completed" {
		t.Errorf("Expected session status 'completed', got %s", stopped.Status)
	}
	if stopped.EndedAt == nil {
		t.Errorf("Expected non-nil EndedAt timestamp on stopped session")
	}

	// 4. Invalid device ID should return error
	_, err = sessionService.Create("test-user-id", &models.CreateSessionRequest{DeviceID: "non-existent"})
	if err == nil {
		t.Errorf("Expected error when creating session with non-existent device")
	}
}

// Test A — Target Alpha with Beta Dominant Measurement
func TestScenarioA_AlphaTargetWithBetaMeasurement(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	sessionService := sessions.NewService(memStore, hub, nil)

	// 1. User picks ALPHA and starts session
	createReq := &models.CreateSessionRequest{
		DeviceID:   "dev-001",
		TargetBand: "ALPHA",
	}
	ses, err := sessionService.Create("user-test-01", createReq)
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}
	if ses.TargetBand != "ALPHA" {
		t.Fatalf("Expected targetBand ALPHA, got %s", ses.TargetBand)
	}

	// 2. Incoming EEG data arrives with BETA dominant measurement
	betaFeature := &models.BrainwaveFeature{
		ID:        "bw-test-a",
		SessionID: ses.ID,
		Delta:     8.0,
		Theta:     12.0,
		Alpha:     18.0,
		Beta:      48.0, // BETA dominant (48%)
		Gamma:     14.0,
	}
	if err := memStore.SaveBrainwaveFeature(betaFeature); err != nil {
		t.Fatalf("Failed to save spectral feature: %v", err)
	}

	// 3. Save mock ML prediction with genuine task class
	mlPred := &models.MLPrediction{
		ID:             "pred-test-a",
		SessionID:      ses.ID,
		ModelName:      "Support Vector Machine (SVM)",
		ModelVersion:   "v1.0.0",
		PredictedClass: "Focused / High Beta",
		Confidence:     0.87,
	}
	if err := memStore.SaveMLPrediction(mlPred); err != nil {
		t.Fatalf("Failed to save ML prediction: %v", err)
	}

	// 4. Verify session target remains strictly ALPHA
	refetched, err := sessionService.GetByID(ses.ID)
	if err != nil || refetched == nil {
		t.Fatalf("Failed to retrieve session: %v", err)
	}
	if refetched.TargetBand != "ALPHA" {
		t.Errorf("VIOLATION: session TargetBand was overwritten! Expected 'ALPHA', got '%s'", refetched.TargetBand)
	}

	// Verify measured features are intact and Beta is dominant
	feats, _ := memStore.GetBrainwaveFeatures(ses.ID)
	if len(feats) == 0 || feats[0].Beta != 48.0 {
		t.Errorf("Expected Beta feature 48.0, got %v", feats)
	}

	// Verify ML prediction is intact
	preds, _ := memStore.GetMLPredictions(ses.ID)
	if len(preds) == 0 || preds[0].PredictedClass != "Focused / High Beta" {
		t.Errorf("Expected predicted class 'Focused / High Beta', got %v", preds)
	}
}

// Test B — Target Theta with Alpha Dominant Measurement
func TestScenarioB_ThetaTargetWithAlphaMeasurement(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	sessionService := sessions.NewService(memStore, hub, nil)

	// 1. User picks THETA and starts session
	createReq := &models.CreateSessionRequest{
		DeviceID:   "dev-001",
		TargetBand: "THETA",
	}
	ses, err := sessionService.Create("user-test-01", createReq)
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}
	if ses.TargetBand != "THETA" {
		t.Fatalf("Expected targetBand THETA, got %s", ses.TargetBand)
	}

	// 2. Incoming EEG data arrives with ALPHA dominant measurement
	alphaFeature := &models.BrainwaveFeature{
		ID:        "bw-test-b",
		SessionID: ses.ID,
		Delta:     10.0,
		Theta:     15.0,
		Alpha:     50.0, // ALPHA dominant (50%)
		Beta:      15.0,
		Gamma:     10.0,
	}
	_ = memStore.SaveBrainwaveFeature(alphaFeature)

	// 3. Verify session target remains THETA despite Alpha dominant measurement
	refetched, _ := sessionService.GetByID(ses.ID)
	if refetched.TargetBand != "THETA" {
		t.Errorf("VIOLATION: session TargetBand was overwritten! Expected 'THETA', got '%s'", refetched.TargetBand)
	}
}

// Test C — Target Band Immutable During RUNNING and Validated
func TestScenarioC_ImmutableTargetDuringRunning(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	sessionService := sessions.NewService(memStore, hub, nil)

	// 1. Invalid target enum must be rejected
	invalidReq := &models.CreateSessionRequest{
		DeviceID:   "dev-001",
		TargetBand: "SUPER_DELTA_UNKNOWN",
	}
	_, err := sessionService.Create("user-test-01", invalidReq)
	if err == nil {
		t.Fatalf("Expected error when providing invalid target band enum")
	}

	// 2. Start valid session with ALPHA
	validReq := &models.CreateSessionRequest{
		DeviceID:   "dev-001",
		TargetBand: "ALPHA",
	}
	ses, err := sessionService.Create("user-test-01", validReq)
	if err != nil {
		t.Fatalf("Failed to create valid session: %v", err)
	}

	// 3. Attempt to mutate device on Hub during RUNNING: Hub locks and ignores
	hub.SetDevice("dev-002", "TGAM1 Wearable Headset Beta")

	// 4. Stop session
	stopped, err := sessionService.Stop(ses.ID)
	if err != nil {
		t.Fatalf("Failed to stop session: %v", err)
	}
	if stopped.TargetBand != "ALPHA" {
		t.Errorf("Expected stopped session to preserve TargetBand 'ALPHA', got '%s'", stopped.TargetBand)
	}
}

// Test D — Sesi Baru: Multiple sessions with distinct targets have zero state leakage
func TestScenarioD_NewSessionIndependentTarget(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	sessionService := sessions.NewService(memStore, hub, nil)

	// Session 1 with ALPHA
	ses1, err := sessionService.Create("user-test-01", &models.CreateSessionRequest{
		DeviceID:   "dev-001",
		TargetBand: "ALPHA",
	})
	if err != nil {
		t.Fatalf("Failed to create session 1: %v", err)
	}
	_, _ = sessionService.Stop(ses1.ID)

	// Session 2 with BETA
	ses2, err := sessionService.Create("user-test-01", &models.CreateSessionRequest{
		DeviceID:   "dev-002",
		TargetBand: "BETA",
	})
	if err != nil {
		t.Fatalf("Failed to create session 2: %v", err)
	}

	// Check Session 1 is still ALPHA
	refetched1, _ := sessionService.GetByID(ses1.ID)
	if refetched1.TargetBand != "ALPHA" {
		t.Errorf("Session 1 corrupted! Expected 'ALPHA', got '%s'", refetched1.TargetBand)
	}

	// Check Session 2 is BETA
	refetched2, _ := sessionService.GetByID(ses2.ID)
	if refetched2.TargetBand != "BETA" {
		t.Errorf("Session 2 corrupted! Expected 'BETA', got '%s'", refetched2.TargetBand)
	}
}

// Test E — WebSocket & Refresh: Source of truth in backend remains unchanged across queries
func TestScenarioE_WebSocketAndRefreshConsistency(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	sessionService := sessions.NewService(memStore, hub, nil)

	ses, err := sessionService.Create("user-test-01", &models.CreateSessionRequest{
		DeviceID:   "dev-001",
		TargetBand: "GAMMA",
	})
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	// Simulate multiple client reconnects / refetches
	for i := 0; i < 5; i++ {
		fetched, err := sessionService.GetByID(ses.ID)
		if err != nil || fetched == nil {
			t.Fatalf("Failed on refetch %d: %v", i, err)
		}
		if fetched.TargetBand != "GAMMA" {
			t.Errorf("Refetch %d: expected 'GAMMA', got '%s'", i, fetched.TargetBand)
		}
	}
}

func TestSessionMetadataAndUpdates(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	sessionService := sessions.NewService(memStore, hub, nil)

	// 1. Verify that simulated device dev-001 CANNOT claim "live" mode
	invalidLiveReq := &models.CreateSessionRequest{
		DeviceID:        "dev-001",
		ParticipantName: "Ahmad Rizky",
		Title:           "Uji Coba Aritmatika Mental",
		Notes:           "Pengukuran fokus kognitif 10 menit",
		AcquisitionMode: "live",
		TargetBand:      "BETA",
	}
	_, err := sessionService.Create("user-test-01", invalidLiveReq)
	if err == nil {
		t.Fatalf("Expected error when claiming 'live' acquisition mode on simulated device dev-001, got nil")
	}

	// 2. Verify that disconnected hardware device CANNOT claim "live" mode
	disconnectedDev := &models.Device{
		ID:         "esp32-offline-01",
		DeviceCode: "ESP32-OFFLINE",
		Name:       "ESP32 Offline Hardware",
		Status:     "disconnected",
		LastSeen:   time.Now().Add(-10 * time.Minute),
	}
	_ = memStore.CreateDevice(disconnectedDev)
	_, err = sessionService.Create("user-test-01", &models.CreateSessionRequest{
		DeviceID:        disconnectedDev.ID,
		AcquisitionMode: "live",
	})
	if err == nil {
		t.Fatalf("Expected error when claiming 'live' acquisition mode on disconnected hardware gateway, got nil")
	}

	// 3. Verify that mode 'unknown' does NOT run simulation and registers as 'unknown'
	unknownSes, err := sessionService.Create("user-test-01", &models.CreateSessionRequest{
		DeviceID:        "dev-001",
		AcquisitionMode: "unknown",
	})
	if err != nil {
		t.Fatalf("Failed to create unknown session: %v", err)
	}
	if unknownSes.AcquisitionMode != models.AcquisitionModeUnknown {
		t.Errorf("Expected AcquisitionMode 'unknown', got '%s'", unknownSes.AcquisitionMode)
	}

	// 4. Verify that connected gateway with heartbeat CAN create live session before sending EEG (solves deadlock)
	createReq := &models.CreateSessionRequest{
		DeviceID:        "esp32-eeg-gateway-01",
		ParticipantName: "Ahmad Rizky",
		Title:           "Uji Coba Aritmatika Mental",
		Notes:           "Pengukuran fokus kognitif 10 menit",
		AcquisitionMode: "live",
		TargetBand:      "BETA",
	}

	hwDev, _ := memStore.GetDeviceByID("esp32-eeg-gateway-01")
	hwDev.Status = "connected"
	hwDev.LastSeen = time.Now()
	hwDev.LastEEGStreamAt = nil // Has not started sending EEG yet
	_ = memStore.UpdateDevice(hwDev)

	ses, err := sessionService.Create("user-test-01", createReq)
	if err != nil {
		t.Fatalf("Expected live session creation to succeed for online gateway without prior stream, got err: %v", err)
	}
	if ses.AcquisitionMode != models.AcquisitionModeLive {
		t.Errorf("Expected AcquisitionMode 'live', got '%s'", ses.AcquisitionMode)
	}

	// 5. Verify that stale heartbeat (> 60s) is REJECTED
	staleHeartbeat := time.Now().Add(-65 * time.Second)
	hwDev.LastSeen = staleHeartbeat
	_ = memStore.UpdateDevice(hwDev)

	_, err = sessionService.Create("user-test-01", createReq)
	if err == nil {
		t.Fatalf("Expected error when claiming 'live' on hardware device with stale heartbeat (> 60s), got nil")
	}

	// Restore online device
	hwDev.LastSeen = time.Now()
	_ = memStore.UpdateDevice(hwDev)

	if ses.ParticipantName != "Ahmad Rizky" {
		t.Errorf("Expected ParticipantName 'Ahmad Rizky', got '%s'", ses.ParticipantName)
	}
	if ses.Title != "Uji Coba Aritmatika Mental" {
		t.Errorf("Expected Title 'Uji Coba Aritmatika Mental', got '%s'", ses.Title)
	}
	if ses.Notes != "Pengukuran fokus kognitif 10 menit" {
		t.Errorf("Expected Notes 'Pengukuran fokus kognitif 10 menit', got '%s'", ses.Notes)
	}
	if ses.AcquisitionMode != "live" {
		t.Errorf("Expected AcquisitionMode 'live', got '%s'", ses.AcquisitionMode)
	}

	// 10. Verify that empty acquisitionMode ALWAYS defaults to 'simulated' (No auto-promotion to live)
	emptyModeReq := &models.CreateSessionRequest{
		DeviceID:        "esp32-eeg-gateway-01",
		ParticipantName: "Siti Rahma",
		Title:           "Sesi Default Mode",
		AcquisitionMode: "", // Omitted / empty
	}
	defSes, err := sessionService.Create("user-test-01", emptyModeReq)
	if err != nil {
		t.Fatalf("Failed to create session with empty acquisitionMode: %v", err)
	}
	if defSes.AcquisitionMode != models.AcquisitionModeSimulated {
		t.Errorf("VIOLATION: Empty acquisitionMode auto-promoted to '%s'! Must strictly be 'simulated'", defSes.AcquisitionMode)
	}

	// Test Update
	updateReq := &models.UpdateSessionRequest{
		Title: "Uji Coba Aritmatika Mental Sesi 2",
		Notes: "Catatan diperbarui setelah pengukuran",
	}
	updated, err := sessionService.Update(ses.ID, updateReq)
	if err != nil {
		t.Fatalf("Failed to update session: %v", err)
	}
	if updated.Title != "Uji Coba Aritmatika Mental Sesi 2" {
		t.Errorf("Expected updated title, got '%s'", updated.Title)
	}
	if updated.Notes != "Catatan diperbarui setelah pengukuran" {
		t.Errorf("Expected updated notes, got '%s'", updated.Notes)
	}
	// ParticipantName should remain Ahmad Rizky
	if updated.ParticipantName != "Ahmad Rizky" {
		t.Errorf("Expected participant name preserved, got '%s'", updated.ParticipantName)
	}
}

func TestSessionAnalysisReportGeneration(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	sessionService := sessions.NewService(memStore, hub, nil)

	ses, err := sessionService.Create("user-test-01", &models.CreateSessionRequest{
		DeviceID:        "esp32-eeg-gateway-01",
		ParticipantName: "Citra Dewi",
		Title:           "Sesi Relaksasi Mata Tertutup",
		Notes:           "Kondisi Resting State",
		AcquisitionMode: "simulated",
		TargetBand:      "ALPHA",
	})
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	// Ingest test samples: values = [10.0, 20.0, 30.0]
	// Mean = 20.0, Min = 10.0, Max = 30.0
	// Variance = ((100 + 400 + 900)/3) - 400 = (1400/3) - 400 = 466.67 - 400 = 66.67
	// StdDev = sqrt(66.67) ~ 8.16
	now := time.Now()
	testSamples := []models.EEGSample{
		{ID: ses.ID + "-s1", SessionID: ses.ID, Timestamp: now.UnixMilli(), RawEEG: 10.0, SignalQuality: 0},
		{ID: ses.ID + "-s2", SessionID: ses.ID, Timestamp: now.UnixMilli() + 2, RawEEG: 20.0, SignalQuality: 0},
		{ID: ses.ID + "-s3", SessionID: ses.ID, Timestamp: now.UnixMilli() + 4, RawEEG: 30.0, SignalQuality: 0},
	}
	_ = memStore.SaveEEGSamples(testSamples)

	// Ingest test features: Alpha dominant
	testFeature := &models.BrainwaveFeature{
		ID:        ses.ID + "-feat1",
		SessionID: ses.ID,
		Timestamp: now.UnixMilli(),
		Delta:     10.0,
		Theta:     15.0,
		Alpha:     50.0,
		Beta:      15.0,
		Gamma:     10.0,
	}
	_ = memStore.SaveBrainwaveFeature(testFeature)

	report, err := sessionService.GetReport(ses.ID)
	if err != nil {
		t.Fatalf("Failed to generate report: %v", err)
	}

	// 1. Session Information verification
	if report.SessionID != ses.ID {
		t.Errorf("Expected SessionID %s, got %s", ses.ID, report.SessionID)
	}
	if report.ParticipantName != "Citra Dewi" {
		t.Errorf("Expected ParticipantName 'Citra Dewi', got '%s'", report.ParticipantName)
	}
	if report.Title != "Sesi Relaksasi Mata Tertutup" {
		t.Errorf("Expected Title, got '%s'", report.Title)
	}

	// 2. Biosignal Statistical Summary verification
	if report.TotalSamples != 3 {
		t.Errorf("Expected 3 samples, got %d", report.TotalSamples)
	}
	if math.Abs(report.SignalStats.Mean-20.0) > 0.05 {
		t.Errorf("Expected Mean ~20.0, got %.2f", report.SignalStats.Mean)
	}
	if report.SignalStats.Min != 10.0 {
		t.Errorf("Expected Min 10.0, got %.2f", report.SignalStats.Min)
	}
	if report.SignalStats.Max != 30.0 {
		t.Errorf("Expected Max 30.0, got %.2f", report.SignalStats.Max)
	}
	if math.Abs(report.SignalStats.StdDev-8.16) > 0.05 {
		t.Errorf("Expected StdDev ~8.16, got %.2f", report.SignalStats.StdDev)
	}
	if report.SignalStats.Unit != "µV (estimated)" {
		t.Errorf("Expected Unit 'µV (estimated)', got '%s'", report.SignalStats.Unit)
	}

	// Backwards compatibility verification
	if report.SignalStats.MeanMicrovolts != report.SignalStats.Mean {
		t.Errorf("Expected MeanMicrovolts == Mean")
	}
	if report.SignalStats.MinMicrovolts != report.SignalStats.Min {
		t.Errorf("Expected MinMicrovolts == Min")
	}
	if report.SignalStats.MaxMicrovolts != report.SignalStats.Max {
		t.Errorf("Expected MaxMicrovolts == Max")
	}

	// 3. Dominant Band Verification (from measured power spectrum)
	if report.DominantBand != "ALPHA" {
		t.Errorf("Expected DominantBand 'ALPHA', got '%s'", report.DominantBand)
	}
	if report.DominantBandPct != 50.0 {
		t.Errorf("Expected DominantBandPct 50.0%%, got %.2f%%", report.DominantBandPct)
	}

	// 4. Honest ML status (must be unavailable when model is not connected, zero fake predictions)
	if report.MLStatus != "unavailable" {
		t.Errorf("Expected MLStatus 'unavailable' when no model, got '%s'", report.MLStatus)
	}
	if report.MLPrediction != nil {
		t.Errorf("Expected nil MLPrediction when offline, got non-nil")
	}

	// 5. Hardware Specifications
	if report.SamplingRateHz != 512 {
		t.Errorf("Expected 512 Hz, got %d", report.SamplingRateHz)
	}
	if report.ChannelCount != 1 {
		t.Errorf("Expected 1 channel, got %d", report.ChannelCount)
	}
	if report.SignalQualityLabel != "Good Contact" {
		t.Errorf("Expected 'Good Contact', got '%s'", report.SignalQualityLabel)
	}
}

func TestPostgresSessionReportAndMetadata(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:*101Abc_@localhost:5432/eeg_db?sslmode=disable"
	}

	pgStore, err := database.NewPostgresStore(dbURL)
	if err != nil {
		t.Skipf("Skipping live Postgres test: database connection error: %v", err)
	}

	hub := ws.NewHub()
	sessionService := sessions.NewService(pgStore, hub, nil)

	// Ensure user-demo-01 exists for FK constraint
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

	sessionID := "pg-meta-test-" + time.Now().Format("20060102150405")
	ses := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        "esp32-eeg-gateway-01",
		ParticipantName: "Budi Santoso",
		Title:           "Sesi Eksperimen Matematika Lab",
		Notes:           "Peserta mengerjakan tugas aritmatika",
		AcquisitionMode: "simulated",
		StartedAt:       time.Now(),
		Duration:        60,
		Status:          "completed",
		TargetBand:      "BETA",
		CreatedAt:       time.Now(),
	}

	if err := pgStore.CreateSession(ses); err != nil {
		t.Fatalf("Failed to create session with metadata in Postgres: %v", err)
	}

	// Fetch from Postgres to verify persistence of new columns
	fetched, err := pgStore.GetSessionByID(sessionID)
	if err != nil || fetched == nil {
		t.Fatalf("Failed to fetch session from Postgres: %v", err)
	}
	if fetched.ParticipantName != "Budi Santoso" {
		t.Errorf("Postgres ParticipantName mismatch: expected 'Budi Santoso', got '%s'", fetched.ParticipantName)
	}
	if fetched.Title != "Sesi Eksperimen Matematika Lab" {
		t.Errorf("Postgres Title mismatch: expected 'Sesi Eksperimen Matematika Lab', got '%s'", fetched.Title)
	}
	if fetched.AcquisitionMode != "simulated" {
		t.Errorf("Postgres AcquisitionMode mismatch: expected 'simulated', got '%s'", fetched.AcquisitionMode)
	}

	// Test Update in Postgres
	updateReq := &models.UpdateSessionRequest{
		Title: "Sesi Eksperimen Matematika Lab (Final)",
		Notes: "Data telah divalidasi oleh asisten lab",
	}
	updated, err := sessionService.Update(sessionID, updateReq)
	if err != nil {
		t.Fatalf("Failed to update session in Postgres: %v", err)
	}
	if updated.Title != "Sesi Eksperimen Matematika Lab (Final)" {
		t.Errorf("Updated Title mismatch in Postgres: got '%s'", updated.Title)
	}

	// Test GetReport on Postgres
	report, err := sessionService.GetReport(sessionID)
	if err != nil {
		t.Fatalf("Failed to generate report on Postgres: %v", err)
	}
	if report.Title != "Sesi Eksperimen Matematika Lab (Final)" {
		t.Errorf("Report Title mismatch: got '%s'", report.Title)
	}
	if report.ParticipantName != "Budi Santoso" {
		t.Errorf("Report ParticipantName mismatch: got '%s'", report.ParticipantName)
	}
}
