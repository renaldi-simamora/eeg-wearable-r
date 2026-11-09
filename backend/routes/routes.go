package routes

import (
	"net/http"
	"sync"
	"time"

	"eeg-backend/config"
	"eeg-backend/internal/analysis"
	"eeg-backend/internal/auth"
	"eeg-backend/internal/dashboard"
	"eeg-backend/internal/database"
	"eeg-backend/internal/devices"
	"eeg-backend/internal/eeg"
	"eeg-backend/internal/middleware"
	"eeg-backend/internal/sessions"
	"eeg-backend/internal/users"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/models"

	"github.com/gin-gonic/gin"
)

var (
	activeSessionsService *sessions.Service
	activeAnalysisService *analysis.Service
	activeSessionsMu      sync.Mutex
)

// StopServices stops all active background workers cleanly
func StopServices() {
	activeSessionsMu.Lock()
	defer activeSessionsMu.Unlock()
	if activeSessionsService != nil {
		activeSessionsService.StopPeriodicRecovery()
	}
	if activeAnalysisService != nil {
		activeAnalysisService.StopWorker()
	}
}

func SetupRouter(cfg *config.Config, store database.Store, hub *ws.Hub) *gin.Engine {
	r := gin.New()

	// Global middleware
	r.Use(gin.Recovery())
	r.Use(middleware.LoggerMiddleware())
	r.Use(middleware.CORSMiddleware(cfg.CORSOrigin, cfg.IsProduction()))

	// Enforce CORS origin verification on WebSocket Hub as well
	if hub != nil {
		hub.SetOriginChecker(middleware.GetWebSocketCheckOrigin(cfg.CORSOrigin, cfg.IsProduction()))
	}

	// Health check (available at /health and /api/health)
	healthHandler := func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "EEG Wearable Backend",
			"project": "Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning",
		})
	}
	r.GET("/health", healthHandler)
	r.GET("/api/health", healthHandler)

	// WebSocket route for live EEG stream
	r.GET("/ws/eeg", hub.HandleWebSocket)
	r.GET("/api/ws/eeg", hub.HandleWebSocket)

	// Services & Handlers
	authService := auth.NewService(store, cfg.JWTSecret, cfg.GoogleClientID)
	authHandler := auth.NewHandler(authService)

	usersService := users.NewService(store)
	usersHandler := users.NewHandler(usersService)

	devicesService := devices.NewService(store)
	devicesHandler := devices.NewHandler(devicesService)

	analysisService := analysis.NewService(store, cfg.MLServiceURL)
	analysisHandler := analysis.NewHandler(analysisService)

	sessionsService := sessions.NewService(store, hub, analysisService)
	if cfg.GracefulStopTimeout > 0 {
		sessionsService.SetGracefulStopTimeout(cfg.GracefulStopTimeout)
	}
	sessionsHandler := sessions.NewHandler(sessionsService)

	eegService := eeg.NewService(store, hub)
	eegService.SetAnalysisService(analysisService)
	eegHandler := eeg.NewHandler(eegService)

	// Start periodic recovery worker (runs on startup and every 30s)
	cutoff := cfg.RecoveryAgeCutoff
	if cutoff <= 0 {
		cutoff = 2 * time.Minute
	}
	sessionsService.StartPeriodicRecovery(30*time.Second, cutoff)

	// Start durable ML classification worker (polls every 3s and reactive on notify)
	analysisService.StartWorker(3 * time.Second)

	activeSessionsMu.Lock()
	if activeSessionsService != nil {
		activeSessionsService.StopPeriodicRecovery()
	}
	if activeAnalysisService != nil {
		activeAnalysisService.StopWorker()
	}
	activeSessionsService = sessionsService
	activeAnalysisService = analysisService
	activeSessionsMu.Unlock()

	dashboardService := dashboard.NewService(store)
	dashboardHandler := dashboard.NewHandler(dashboardService)

	// API Group
	api := r.Group("/api")
	{
		// Public Auth routes
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/register", authHandler.Register)
			authGroup.POST("/login", authHandler.Login)
			authGroup.POST("/google", authHandler.GoogleLogin)
			authGroup.POST("/logout", authHandler.Logout)
		}

		// Public Models list
		api.GET("/models", analysisHandler.GetModels)

		// Protected Routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			// Current user
			protected.GET("/auth/me", authHandler.GetMe)
			protected.GET("/users/me", usersHandler.GetMe)
			protected.PUT("/users/me", usersHandler.UpdateMe)

			// Devices
			protected.GET("/devices", devicesHandler.GetAll)
			protected.GET("/devices/:id", devicesHandler.GetByID)
			protected.POST("/devices", devicesHandler.Create)
			protected.PUT("/devices/:id", devicesHandler.Update)
			protected.DELETE("/devices/:id", devicesHandler.Delete)

			// Sessions
			protected.GET("/sessions", sessionsHandler.GetAll)
			protected.GET("/sessions/:id", sessionsHandler.GetByID)
			protected.POST("/sessions", sessionsHandler.Create)
			protected.PUT("/sessions/:id", sessionsHandler.Update)
			protected.POST("/sessions/:id/stop", sessionsHandler.Stop)
			protected.GET("/sessions/:id/report", sessionsHandler.GetReport)

			// EEG data
			protected.GET("/eeg/:sessionId", eegHandler.GetEEGData)

			// Analysis & ML Classification
			protected.GET("/analysis/:sessionId", analysisHandler.GetAnalysis)
			protected.POST("/analysis/:sessionId/classify", analysisHandler.Classify)

			// Dashboard
			protected.GET("/dashboard/summary", dashboardHandler.GetSummary)
		}

		// EEG Ingestion Route (Supports IoT Hardware Node with X-Device-API-Key or User Bearer JWT)
		api.POST("/eeg/data", middleware.DeviceOrAuthMiddleware(cfg.JWTSecret, cfg.DeviceAPIKey), eegHandler.PostEEGData)

		// IoT ESP32 TGAM1 Dedicated Hardware Ingestion Endpoints (/api/v1/eeg/*)
		// Requires authentic X-Device-API-Key. User JWTs are strictly rejected.
		v1EEG := api.Group("/v1/eeg")
		v1EEG.Use(middleware.HardwareDeviceAuthMiddleware(cfg.DeviceAPIKey))
		{
			v1EEG.POST("/sessions/start", eegHandler.DeviceStartSession)
			v1EEG.POST("/samples", eegHandler.DeviceIngestSamples)
			v1EEG.POST("/sessions/finish", eegHandler.DeviceFinishSession)
			v1EEG.GET("/device/status", eegHandler.DeviceGetStatus)
		}
	}

	// Alias for top-level /v1/eeg/* endpoints (supports ESP32 firmware configured without /api prefix)
	// Requires authentic X-Device-API-Key. User JWTs are strictly rejected.
	topV1 := r.Group("/v1/eeg")
	topV1.Use(middleware.HardwareDeviceAuthMiddleware(cfg.DeviceAPIKey))
	{
		topV1.POST("/sessions/start", eegHandler.DeviceStartSession)
		topV1.POST("/samples", eegHandler.DeviceIngestSamples)
		topV1.POST("/sessions/finish", eegHandler.DeviceFinishSession)
		topV1.GET("/device/status", eegHandler.DeviceGetStatus)
	}

	// 404 handler with standard API response
	r.NoRoute(func(c *gin.Context) {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "Endpoint not found",
		})
	})

	return r
}
