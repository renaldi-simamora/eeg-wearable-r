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
