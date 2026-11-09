package sessions_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"eeg-backend/internal/database"
	"eeg-backend/internal/sessions"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/models"

	"github.com/gin-gonic/gin"
)

func setupTestSession(store database.Store) (*models.Session, *sessions.Handler) {
	gin.SetMode(gin.TestMode)
	hub := ws.NewHub()
	svc := sessions.NewService(store, hub, nil)
	h := sessions.NewHandler(svc)

	now := time.Now()
	ses := &models.Session{
		ID:              "ses-owner-123",
		UserID:          "user-owner",
		DeviceID:        "dev-001",
		ParticipantName: "Subject A",
		Title:           "Baseline Study",
		Status:          "running",
		TargetBand:      "ALPHA",
		StartedAt:       now,
		CreatedAt:       now,
	}
	_ = store.CreateSession(ses)
	return ses, h
}

func TestIDOR_GetByID(t *testing.T) {
	store := database.NewMemoryStore()
	ses, h := setupTestSession(store)

	// 1. Owner accesses own session -> 200 OK
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/sessions/"+ses.ID, nil)
		c.Params = gin.Params{{Key: "id", Value: ses.ID}}
		c.Set("userID", "user-owner")
		c.Set("role", "researcher")

		h.GetByID(c)
		if w.Code != http.StatusOK {
			t.Fatalf("Owner expected 200 OK, got %d. Body: %s", w.Code, w.Body.String())
		}
	}

	// 2. Non-owner accesses other user's session -> 404 Not Found (masked)
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/sessions/"+ses.ID, nil)
		c.Params = gin.Params{{Key: "id", Value: ses.ID}}
		c.Set("userID", "user-intruder")
		c.Set("role", "researcher")

		h.GetByID(c)
		if w.Code != http.StatusNotFound {
			t.Fatalf("Non-owner expected 404 Not Found, got %d. Body: %s", w.Code, w.Body.String())
		}
	}

	// 3. Admin accesses session -> 200 OK
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/sessions/"+ses.ID, nil)
		c.Params = gin.Params{{Key: "id", Value: ses.ID}}
		c.Set("userID", "user-admin")
		c.Set("role", "admin")

		h.GetByID(c)
		if w.Code != http.StatusOK {
			t.Fatalf("Admin expected 200 OK, got %d. Body: %s", w.Code, w.Body.String())
		}
	}

	// 4. Non-existent session -> 404 Not Found
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/sessions/non-existent", nil)
		c.Params = gin.Params{{Key: "id", Value: "non-existent"}}
		c.Set("userID", "user-owner")
		c.Set("role", "researcher")

		h.GetByID(c)
		if w.Code != http.StatusNotFound {
			t.Fatalf("Non-existent session expected 404, got %d", w.Code)
		}
	}

	// 5. Missing context auth -> 401 Unauthorized
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/sessions/"+ses.ID, nil)
		c.Params = gin.Params{{Key: "id", Value: ses.ID}}

		h.GetByID(c)
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("Unauthenticated expected 401, got %d", w.Code)
		}
	}
}

func TestIDOR_UpdateAndStop(t *testing.T) {
	store := database.NewMemoryStore()
	ses, h := setupTestSession(store)

	// Non-owner attempts to Update -> 404 Not Found
	{
		updateBody, _ := json.Marshal(models.UpdateSessionRequest{Title: "Hacked Title"})
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPut, "/api/sessions/"+ses.ID, bytes.NewBuffer(updateBody))
		c.Params = gin.Params{{Key: "id", Value: ses.ID}}
		c.Set("userID", "user-intruder")
		c.Set("role", "researcher")

		h.Update(c)
		if w.Code != http.StatusNotFound {
			t.Fatalf("Non-owner update expected 404, got %d", w.Code)
		}
	}

	// Non-owner attempts to Stop -> 404 Not Found
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/sessions/"+ses.ID+"/stop", nil)
		c.Params = gin.Params{{Key: "id", Value: ses.ID}}
		c.Set("userID", "user-intruder")
		c.Set("role", "researcher")

		h.Stop(c)
		if w.Code != http.StatusNotFound {
			t.Fatalf("Non-owner stop expected 404, got %d", w.Code)
		}
	}

	// Owner successfully stops own session -> 200 OK
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/sessions/"+ses.ID+"/stop", nil)
		c.Params = gin.Params{{Key: "id", Value: ses.ID}}
		c.Set("userID", "user-owner")
		c.Set("role", "researcher")

		h.Stop(c)
		if w.Code != http.StatusOK {
			t.Fatalf("Owner stop expected 200 OK, got %d", w.Code)
		}
	}
}

func TestIDOR_GetReport(t *testing.T) {
	store := database.NewMemoryStore()
	ses, h := setupTestSession(store)

	// Non-owner attempts to GetReport -> 404 Not Found
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/sessions/"+ses.ID+"/report", nil)
		c.Params = gin.Params{{Key: "id", Value: ses.ID}}
		c.Set("userID", "user-intruder")
		c.Set("role", "researcher")

		h.GetReport(c)
		if w.Code != http.StatusNotFound {
			t.Fatalf("Non-owner GetReport expected 404, got %d", w.Code)
		}
	}

	// Owner successfully retrieves own report -> 200 OK
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/sessions/"+ses.ID+"/report", nil)
		c.Params = gin.Params{{Key: "id", Value: ses.ID}}
		c.Set("userID", "user-owner")
		c.Set("role", "researcher")

		h.GetReport(c)
		if w.Code != http.StatusOK {
			t.Fatalf("Owner GetReport expected 200 OK, got %d", w.Code)
		}
	}
}
