package routes

import (
	"net/http"

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

func SetupRouter(cfg *config.Config, store database.Store, hub *ws.Hub) *gin.Engine {
	r := gin.New()

	// Global middleware
	r.Use(gin.Recovery())
	r.Use(middleware.LoggerMiddleware())
	r.Use(middleware.CORSMiddleware(cfg.CORSOrigin))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "EEG Wearable Backend",
			"project": "Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning",
		})
	})

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

	sessionsService := sessions.NewService(store)
	sessionsHandler := sessions.NewHandler(sessionsService)

	eegService := eeg.NewService(store)
	eegHandler := eeg.NewHandler(eegService)

	analysisService := analysis.NewService(store)
	analysisHandler := analysis.NewHandler(analysisService)

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
			protected.POST("/sessions/:id/stop", sessionsHandler.Stop)

			// EEG data
			protected.GET("/eeg/:sessionId", eegHandler.GetEEGData)
			protected.POST("/eeg/data", eegHandler.PostEEGData)

			// Analysis (future ML ready)
			protected.GET("/analysis/:sessionId", analysisHandler.GetAnalysis)

			// Dashboard
			protected.GET("/dashboard/summary", dashboardHandler.GetSummary)
		}
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
