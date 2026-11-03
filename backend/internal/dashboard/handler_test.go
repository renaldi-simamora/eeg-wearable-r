package dashboard_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"eeg-backend/internal/dashboard"
	"eeg-backend/internal/database"
	"eeg-backend/models"

	"github.com/gin-gonic/gin"
)

func TestDashboardGetSummary(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store := database.NewMemoryStore()
	service := dashboard.NewService(store)
	handler := dashboard.NewHandler(service)

	// Test Service directly
	summary, err := service.GetSummary("test-user-id")
	if err != nil {
		t.Fatalf("service.GetSummary failed: %v", err)
	}
	if summary == nil {
		t.Fatalf("expected non-nil summary")
	}

	// Verify device status derived from seeded memory device
	if summary.DeviceStatus != "Connected" && summary.DeviceStatus != "Disconnected" {
		t.Errorf("unexpected DeviceStatus: %s", summary.DeviceStatus)
	}

	// Test Handler HTTP invocation
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/api/dashboard/summary", nil)
	c.Set("userID", "test-user-id")

	handler.GetSummary(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var resp models.APIResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if !resp.Success {
		t.Errorf("expected resp.Success to be true")
	}
}

