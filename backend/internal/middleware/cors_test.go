package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"eeg-backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func TestCORS_DevelopmentMode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	isProduction := false
	corsHandler := middleware.CORSMiddleware("http://localhost:3000", isProduction)

	router := gin.New()
	router.Use(corsHandler)
	router.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})

	// 1. Allowed origin (localhost:3000)
	{
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "http://localhost:3000" {
			t.Errorf("expected Access-Control-Allow-Origin 'http://localhost:3000', got '%s'", origin)
		}
		if creds := w.Header().Get("Access-Control-Allow-Credentials"); creds != "true" {
			t.Errorf("expected Access-Control-Allow-Credentials 'true', got '%s'", creds)
		}
	}

	// 2. Allowed origin (127.0.0.1:3000 automatic dev inclusion)
	{
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "http://127.0.0.1:3000")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "http://127.0.0.1:3000" {
			t.Errorf("expected Access-Control-Allow-Origin 'http://127.0.0.1:3000', got '%s'", origin)
		}
	}

	// 3. Disallowed origin (http://evil-site.com)
	{
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "http://evil-site.com")
		router.ServeHTTP(w, req)

		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "" {
			t.Errorf("expected empty Access-Control-Allow-Origin for unauthorized origin, got '%s'", origin)
		}
	}

	// 4. Preflight OPTIONS from allowed origin -> 204 No Content
	{
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodOptions, "/test", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusNoContent {
			t.Fatalf("expected 204 No Content for preflight, got %d", w.Code)
		}
		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "http://localhost:3000" {
			t.Errorf("expected origin header on valid preflight, got '%s'", origin)
		}
	}

	// 5. Preflight OPTIONS from unauthorized origin -> 403 Forbidden
	{
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodOptions, "/test", nil)
		req.Header.Set("Origin", "http://evil-site.com")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusForbidden {
			t.Fatalf("expected 403 Forbidden for unauthorized preflight, got %d", w.Code)
		}
		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "" {
			t.Errorf("expected no origin header on rejected preflight, got '%s'", origin)
		}
	}
}

func TestCORS_ProductionMode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	isProduction := true

	// In production with explicit domain: only that domain is permitted
	corsHandler := middleware.CORSMiddleware("https://neuropulse.ipb.ac.id", isProduction)
	router := gin.New()
	router.Use(corsHandler)
	router.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})

	// 1. Production origin allowed
	{
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "https://neuropulse.ipb.ac.id")
		router.ServeHTTP(w, req)

		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "https://neuropulse.ipb.ac.id" {
			t.Errorf("expected allowed production origin, got '%s'", origin)
		}
	}

	// 2. Localhost in production MUST BE REJECTED if not in CORS_ORIGIN
	{
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		router.ServeHTTP(w, req)

		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "" {
			t.Errorf("VIOLATION: localhost allowed in production! Got '%s'", origin)
		}
	}

	// 3. In production with empty CORS_ORIGIN: no origins are allowed
	{
		emptyCORSHandler := middleware.CORSMiddleware("", isProduction)
		rEmpty := gin.New()
		rEmpty.Use(emptyCORSHandler)
		rEmpty.GET("/test", func(c *gin.Context) {
			c.String(http.StatusOK, "OK")
		})

		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		rEmpty.ServeHTTP(w, req)

		if origin := w.Header().Get("Access-Control-Allow-Origin"); origin != "" {
			t.Errorf("expected no origin allowed when CORS_ORIGIN is empty in production, got '%s'", origin)
		}
	}
}

func TestWebSocketCORSCheckOrigin(t *testing.T) {
	// Dev mode
	devChecker := middleware.GetWebSocketCheckOrigin("http://localhost:3000", false)

	req1 := httptest.NewRequest(http.MethodGet, "/ws/eeg", nil)
	req1.Header.Set("Origin", "http://localhost:3000")
	if !devChecker(req1) {
		t.Errorf("expected dev checker to allow localhost:3000")
	}

	req2 := httptest.NewRequest(http.MethodGet, "/ws/eeg", nil)
	req2.Header.Set("Origin", "http://malicious.com")
	if devChecker(req2) {
		t.Errorf("expected dev checker to reject malicious.com")
	}

	// Prod mode
	prodChecker := middleware.GetWebSocketCheckOrigin("https://app.neuropulse.id", true)

	req3 := httptest.NewRequest(http.MethodGet, "/ws/eeg", nil)
	req3.Header.Set("Origin", "https://app.neuropulse.id")
	if !prodChecker(req3) {
		t.Errorf("expected prod checker to allow configured origin")
	}

	req4 := httptest.NewRequest(http.MethodGet, "/ws/eeg", nil)
	req4.Header.Set("Origin", "http://localhost:3000")
	if prodChecker(req4) {
		t.Errorf("VIOLATION: prod checker allowed localhost:3000 without configuration")
	}
}
