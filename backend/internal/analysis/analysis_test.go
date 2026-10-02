package analysis_test

import (
	"testing"
	"time"

	"eeg-backend/internal/analysis"
	"eeg-backend/internal/database"
	"eeg-backend/models"
)

func TestAnalysisService(t *testing.T) {
	memStore := database.NewMemoryStore()
	analysisService := analysis.NewService(memStore, "http://127.0.0.1:5000")

	// 1. Test GetModels
	modelsList := analysisService.GetModels()
	if len(modelsList) == 0 {
		t.Errorf("Expected at least one model card definition")
	}

	foundSVM := false
	for _, m := range modelsList {
		if m.ID == "svm-classifier" {
			foundSVM = true
		}
	}
	if !foundSVM {
		t.Errorf("Expected svm-classifier in model list")
	}

	// 2. Test GetAnalysis for unclassified session with no features
	sessionID := "ses-empty-analysis"
	res, err := analysisService.GetAnalysisBySession(sessionID)
	if err != nil {
		t.Fatalf("GetAnalysisBySession failed: %v", err)
	}

	if res["status"] != "unprocessed" {
		t.Errorf("Expected status 'unprocessed' for empty session, got %v", res["status"])
	}

	// 3. Test saving ML Prediction manually into store and retrieving
	pred := &models.MLPrediction{
		ID:             "pred-001",
		SessionID:      sessionID,
		Timestamp:      time.Now().UnixMilli(),
		ModelName:      "Support Vector Machine (SVM)",
		ModelVersion:   "v1.0.0",
		PredictedClass: "Relaxed / High Alpha",
		Confidence:     0.88,
		CreatedAt:      time.Now(),
	}

	if err := memStore.SaveMLPrediction(pred); err != nil {
		t.Fatalf("Failed to save ML prediction: %v", err)
	}

	resAfter, err := analysisService.GetAnalysisBySession(sessionID)
	if err != nil {
		t.Fatalf("GetAnalysisBySession failed after prediction: %v", err)
	}

	if resAfter["status"] != "completed" {
		t.Errorf("Expected status 'completed', got %v", resAfter["status"])
	}
}
