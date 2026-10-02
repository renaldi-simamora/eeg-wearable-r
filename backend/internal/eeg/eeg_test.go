package eeg_test

import (
	"testing"
	"time"

	"eeg-backend/internal/database"
	"eeg-backend/internal/eeg"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/models"
)

func TestEEGSamplesIngestionAndRetrieval(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	eegService := eeg.NewService(memStore, hub)

	sessionID := "test-session-eeg-01"

	// 1. Initial state: No samples or features recorded yet
	initialData, err := eegService.GetEEGBySession(sessionID)
	if err != nil {
		t.Fatalf("Failed to query initial EEG data: %v", err)
	}

	samples := initialData["samples"].([]models.EEGSample)
	if len(samples) != 0 {
		t.Errorf("Expected 0 samples for empty session, got %d (must not synthesize fake data)", len(samples))
	}

	// 2. Ingest valid samples and features
	now := time.Now().UnixMilli()
	ingestReq := &models.PostEEGDataRequest{
		SessionID: sessionID,
		Samples: []models.EEGSample{
			{
				Timestamp:     now,
				RawEEG:        24.5,
				SignalQuality: 95,
			},
			{
				Timestamp:     now + 2,
				RawEEG:        22.1,
				SignalQuality: 95,
			},
		},
		Features: &models.BrainwaveFeature{
			Delta: 14.5,
			Theta: 18.2,
			Alpha: 42.0,
			Beta:  19.1,
			Gamma: 6.2,
		},
	}

	if err := eegService.SaveEEGData(ingestReq); err != nil {
		t.Fatalf("Failed to save EEG data: %v", err)
	}

	// 3. Query after ingestion
	dataAfter, err := eegService.GetEEGBySession(sessionID)
	if err != nil {
		t.Fatalf("Failed to query EEG data after ingestion: %v", err)
	}

	samplesAfter := dataAfter["samples"].([]models.EEGSample)
	if len(samplesAfter) != 2 {
		t.Errorf("Expected 2 samples, got %d", len(samplesAfter))
	}

	latestFeat := dataAfter["latestFeature"].(*models.BrainwaveFeature)
	if latestFeat == nil {
		t.Fatalf("Expected non-nil latestFeature")
	}
	if latestFeat.Alpha != 42.0 {
		t.Errorf("Expected Alpha 42.0, got %f", latestFeat.Alpha)
	}
}
