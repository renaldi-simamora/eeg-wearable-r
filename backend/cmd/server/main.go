package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"eeg-backend/config"
	"eeg-backend/internal/database"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/routes"
)

// RunServerWithShutdown starts the HTTP server in a background goroutine and coordinates graceful shutdown
// upon receiving an OS signal (SIGINT, SIGTERM) or error.
func RunServerWithShutdown(srv *http.Server, store database.Store, stopCh <-chan os.Signal, shutdownTimeout time.Duration) error {
	if shutdownTimeout <= 0 {
		shutdownTimeout = 10 * time.Second
	}

	serverErrCh := make(chan error, 1)
	go func() {
		log.Printf("[SERVER] Starting HTTP & WebSocket server on %s", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrCh <- err
		}
	}()

	select {
	case err := <-serverErrCh:
		return fmt.Errorf("server startup failed: %w", err)
	case sig := <-stopCh:
		log.Printf("[SERVER] Received signal %v. Initiating graceful shutdown...", sig)
	}

	// 1. Context with timeout for graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	var shutdownErr error

	// 2. Gracefully stop accepting new HTTP requests and finish in-flight requests
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("[SERVER ERROR] HTTP server shutdown error: %v", err)
		shutdownErr = err
	} else {
		log.Println("[SERVER] HTTP server closed gracefully.")
	}

	// 3. Stop background workers (periodic recovery, durable ML worker)
	routes.StopServices()
	log.Println("[SERVER] Background services stopped.")

	// 4. Safely close database connection
	if store != nil {
		if err := store.Close(); err != nil {
			log.Printf("[SERVER ERROR] Database close error: %v", err)
			if shutdownErr == nil {
				shutdownErr = err
			}
		} else {
			log.Println("[SERVER] Database connection closed.")
		}
	}

	return shutdownErr
}

func main() {
	log.Println("=================================================================")
	log.Println("  EEG Wearable Platform - Go Backend API Gateway")
	log.Println("  Academic Project: Rancang Bangun Perangkat IoT Wearable Berbasis EEG")
	log.Println("=================================================================")

	cfg := config.LoadConfig()

	// Enforce strict secret configuration before binding ports
	if err := cfg.Validate(); err != nil {
		log.Fatalf("[CONFIG FATAL] Server startup aborted: %v", err)
	}

	// Initialize database layer (PostgreSQL with graceful in-memory fallback)
	store := database.InitDatabase(cfg.DatabaseURL)

	// Initialize WebSocket Hub
	hub := ws.NewHub()

	// Setup Gin router
	router := routes.SetupRouter(cfg, store, hub)

	srv := &http.Server{
		Addr:           ":" + cfg.Port,
		Handler:        router,
		ReadTimeout:    15 * time.Second,
		WriteTimeout:   30 * time.Second,
		IdleTimeout:    60 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB
	}

	stopCh := make(chan os.Signal, 1)
	signal.Notify(stopCh, os.Interrupt, syscall.SIGTERM, syscall.SIGINT)

	if err := RunServerWithShutdown(srv, store, stopCh, 10*time.Second); err != nil {
		log.Fatalf("[SERVER FATAL] Shutdown error: %v", err)
	}
	log.Println("[SERVER] Server process terminated gracefully.")
}
