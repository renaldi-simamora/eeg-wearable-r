package eeg_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"eeg-backend/internal/database"
	"eeg-backend/internal/eeg"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/models"

	"github.com/gin-gonic/gin"
)

func setupEEGTestSession(store database.Store) (*models.Session, *eeg.Handler) {
	gin.SetMode(gin.TestMode)
	hub := ws.NewHub()
	svc := eeg.NewService(store, hub)
	h := eeg.NewHandler(svc)

	now := time.Now()
	ses := &models.Session{
		ID:        "ses-eeg-owner-123",
		UserID:    "user-owner",
		DeviceID:  "dev-001",
		Status:    "running",
		StartedAt: now,
		CreatedAt: now,
	}
	_ = store.CreateSession(ses)

	// Seed some samples
	samples := []models.EEGSample{
		{
			ID:        "sample-1",
			SessionID: ses.ID,
			Timestamp: now.UnixMilli(),
			RawEEG:    12.5,
			CreatedAt: now,
		},
	}
	_ = store.SaveEEGSamples(samples)

	return ses, h
}

func TestIDOR_GetEEGData(t *testing.T) {
	store := database.NewMemoryStore()
	ses, h := setupEEGTestSession(store)

	// 1. Owner accesses own EEG data -> 200 OK
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/eeg/"+ses.ID, nil)
		c.Params = gin.Params{{Key: "sessionId", Value: ses.ID}}
		c.Set("userID", "user-owner")
		c.Set("role", "researcher")

		h.GetEEGData(c)
		if w.Code != http.StatusOK {
			t.Fatalf("Owner expected 200 OK, got %d. Body: %s", w.Code, w.Body.String())
		}
	}

	// 2. Non-owner accesses other user's EEG data -> 404 Not Found (masked)
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/eeg/"+ses.ID, nil)
		c.Params = gin.Params{{Key: "sessionId", Value: ses.ID}}
		c.Set("userID", "user-intruder")
		c.Set("role", "researcher")

		h.GetEEGData(c)
		if w.Code != http.StatusNotFound {
			t.Fatalf("Non-owner expected 404 Not Found, got %d. Body: %s", w.Code, w.Body.String())
		}
	}

	// 3. Admin accesses EEG data -> 200 OK
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/eeg/"+ses.ID, nil)
		c.Params = gin.Params{{Key: "sessionId", Value: ses.ID}}
		c.Set("userID", "user-admin")
		c.Set("role", "admin")

		h.GetEEGData(c)
		if w.Code != http.StatusOK {
			t.Fatalf("Admin expected 200 OK, got %d", w.Code)
		}
	}

	// 4. Missing context auth -> 401 Unauthorized
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/eeg/"+ses.ID, nil)
		c.Params = gin.Params{{Key: "sessionId", Value: ses.ID}}

		h.GetEEGData(c)
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("Unauthenticated expected 401, got %d", w.Code)
		}
	}
}

func TestIDOR_PostEEGData_UserMode(t *testing.T) {
	store := database.NewMemoryStore()
	ses, h := setupEEGTestSession(store)

	bodyBytes, _ := json.Marshal(models.PostEEGDataRequest{
		SessionID: ses.ID,
		Samples: []models.EEGSample{
			{
				Timestamp: time.Now().UnixMilli(),
				RawEEG:    15.0,
			},
		},
	})

	// Non-owner user posting EEG data to other's session -> 404 Not Found
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/eeg/data", bytes.NewBuffer(bodyBytes))
		c.Set("isDevice", false)
		c.Set("userID", "user-intruder")
		c.Set("role", "researcher")

		h.PostEEGData(c)
		if w.Code != http.StatusNotFound {
			t.Fatalf("Non-owner PostEEGData expected 404, got %d", w.Code)
		}
	}

	// Authenticated device posting EEG data -> 201 Created
	{
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/eeg/data", bytes.NewBuffer(bodyBytes))
		c.Set("isDevice", true)

		h.PostEEGData(c)
		if w.Code != http.StatusCreated {
			t.Fatalf("Device PostEEGData expected 201, got %d. Body: %s", w.Code, w.Body.String())
		}
	}
}
