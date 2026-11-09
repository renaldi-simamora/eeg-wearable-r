package analysis_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"eeg-backend/internal/analysis"
	"eeg-backend/internal/database"
	"eeg-backend/models"

	"github.com/gin-gonic/gin"
)

func setupAnalysisTestSession(store database.Store) (*models.Session, *analysis.Handler) {
	gin.SetMode(gin.TestMode)
	svc := analysis.NewService(store, "http://localhost:59999") // unreachable dummy ML service
	h := analysis.NewHandler(svc)

	now := time.Now()
	ses := &models.Session{
		ID:        "ses-analysis-owner-123",
		UserID:    "user-owner",
		DeviceID:  "dev-001",
		Status:    "completed",
		StartedAt: now,
		CreatedAt: now,
	}
	_ = store.CreateSession(ses)

	return ses, h
}

func TestIDOR_GetAnalysis(t *testing.T) {
	store := database.NewMemoryStore()
	ses, h := setupAnalysisTestSession(store)

	// 1. Owner accesses own session analysis -> 200 OK
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/analysis/"+ses.ID, nil)
		c.Params = gin.Params{{Key: "sessionId", Value: ses.ID}}
		c.Set("userID", "user-owner")
		c.Set("role", "researcher")

		h.GetAnalysis(c)
		if w.Code != http.StatusOK {
			t.Fatalf("Owner expected 200 OK, got %d. Body: %s", w.Code, w.Body.String())
		}
	}

	// 2. Non-owner accesses other user's session analysis -> 404 Not Found (masked)
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/analysis/"+ses.ID, nil)
		c.Params = gin.Params{{Key: "sessionId", Value: ses.ID}}
		c.Set("userID", "user-intruder")
		c.Set("role", "researcher")

		h.GetAnalysis(c)
		if w.Code != http.StatusNotFound {
			t.Fatalf("Non-owner expected 404 Not Found, got %d. Body: %s", w.Code, w.Body.String())
		}
	}

	// 3. Admin accesses session analysis -> 200 OK
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/analysis/"+ses.ID, nil)
		c.Params = gin.Params{{Key: "sessionId", Value: ses.ID}}
		c.Set("userID", "user-admin")
		c.Set("role", "admin")

		h.GetAnalysis(c)
		if w.Code != http.StatusOK {
			t.Fatalf("Admin expected 200 OK, got %d", w.Code)
		}
	}

	// 4. Missing context auth -> 401 Unauthorized
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/analysis/"+ses.ID, nil)
		c.Params = gin.Params{{Key: "sessionId", Value: ses.ID}}

		h.GetAnalysis(c)
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("Unauthenticated expected 401, got %d", w.Code)
		}
	}
}

func TestIDOR_Classify(t *testing.T) {
	store := database.NewMemoryStore()
	ses, h := setupAnalysisTestSession(store)

	// Non-owner attempts to trigger Classify -> 404 Not Found immediately without touching ML service
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/analysis/"+ses.ID+"/classify", nil)
		c.Params = gin.Params{{Key: "sessionId", Value: ses.ID}}
		c.Set("userID", "user-intruder")
		c.Set("role", "researcher")

		h.Classify(c)
		if w.Code != http.StatusNotFound {
			t.Fatalf("Non-owner Classify expected 404 Not Found, got %d", w.Code)
		}
	}
}
