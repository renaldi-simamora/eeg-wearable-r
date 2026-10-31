package sessions_test

import (
	"testing"

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
