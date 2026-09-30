package main

import (
	"log"

	"eeg-backend/config"
	"eeg-backend/internal/database"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/routes"
)

func main() {
	log.Println("=================================================================")
	log.Println("  EEG Wearable Platform - Go Backend API Gateway")
	log.Println("  Academic Project: Rancang Bangun Perangkat IoT Wearable Berbasis EEG")
	log.Println("=================================================================")

	cfg := config.LoadConfig()

	// Initialize database layer (PostgreSQL with graceful in-memory fallback)
	store := database.InitDatabase(cfg.DatabaseURL)

	// Initialize WebSocket Hub
	hub := ws.NewHub()

	// Setup Gin router
	router := routes.SetupRouter(cfg, store, hub)

	log.Printf("[SERVER] Starting HTTP & WebSocket server on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("[SERVER] Fatal server failure: %v", err)
	}
}
