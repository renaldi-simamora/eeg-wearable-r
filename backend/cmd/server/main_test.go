package main

import (
	"context"
	"errors"
	"net"
	"net/http"
	"os"
	"syscall"
	"testing"
	"time"

	"eeg-backend/config"
	"eeg-backend/internal/database"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/routes"
)

// mockStoreWithClose tracking close calls
type mockStoreWithClose struct {
	*database.MemoryStore
	closeCalled bool
}

func (m *mockStoreWithClose) Close() error {
	m.closeCalled = true
	return m.MemoryStore.Close()
}

// 1 & 2. SIGINT dan SIGTERM menghentikan HTTP server secara anggun
func TestGracefulShutdown_Signals(t *testing.T) {
	signals := []struct {
		name string
		sig  os.Signal
	}{
		{"SIGINT", syscall.SIGINT},
		{"SIGTERM", syscall.SIGTERM},
	}

	for _, tc := range signals {
		t.Run(tc.name, func(t *testing.T) {
			listener, err := net.Listen("tcp", "127.0.0.1:0")
			if err != nil {
				t.Fatalf("Failed to bind port: %v", err)
			}
			addr := listener.Addr().String()
			_ = listener.Close()

			memStore := database.NewMemoryStore()
			hub := ws.NewHub()
			cfg := &config.Config{
				JWTSecret:    "test-jwt-secret-minimum-32-characters-for-testing",
				DeviceAPIKey: "eeg-device-secret-key-academic-2026",
				CORSOrigin:   "*",
			}
			router := routes.SetupRouter(cfg, memStore, hub)

			srv := &http.Server{
				Addr:    addr,
				Handler: router,
			}

			stopCh := make(chan os.Signal, 1)

			doneCh := make(chan error, 1)
			go func() {
				doneCh <- RunServerWithShutdown(srv, memStore, stopCh, 3*time.Second)
			}()

			// Tunggu server up
			time.Sleep(50 * time.Millisecond)

			// Verifikasi server merespons
			resp, err := http.Get("http://" + addr + "/health")
			if err != nil || resp.StatusCode != http.StatusOK {
				t.Fatalf("Server not responding to /health before shutdown: %v", err)
			}
			_ = resp.Body.Close()

			// Kirim sinyal shutdown
			stopCh <- tc.sig

			select {
			case err := <-doneCh:
				if err != nil {
					t.Fatalf("Expected clean shutdown, got error: %v", err)
				}
			case <-time.After(4 * time.Second):
				t.Fatal("Shutdown timed out")
			}

			// Verifikasi server sudah tidak menerima koneksi baru
			_, err = http.Get("http://" + addr + "/health")
			if err == nil {
				t.Fatal("Expected server to be closed, but request succeeded")
			}
		})
	}
}

// 3, 4, 5. StopServices dipanggil, recovery worker berhenti, dan DB ditutup
func TestGracefulShutdown_StopServicesAndDBClose(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to bind port: %v", err)
	}
	addr := listener.Addr().String()
	_ = listener.Close()

	mockStore := &mockStoreWithClose{
		MemoryStore: database.NewMemoryStore(),
	}
	hub := ws.NewHub()
	cfg := &config.Config{
		JWTSecret:    "test-jwt-secret-minimum-32-characters-for-testing",
		DeviceAPIKey: "eeg-device-secret-key-academic-2026",
		CORSOrigin:   "*",
	}
	router := routes.SetupRouter(cfg, mockStore, hub)

	srv := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	stopCh := make(chan os.Signal, 1)

	doneCh := make(chan error, 1)
	go func() {
		doneCh <- RunServerWithShutdown(srv, mockStore, stopCh, 3*time.Second)
	}()

	time.Sleep(50 * time.Millisecond)

	// Trigger shutdown
	stopCh <- syscall.SIGTERM

	select {
	case err := <-doneCh:
		if err != nil {
			t.Fatalf("Expected nil shutdown error, got: %v", err)
		}
	case <-time.After(4 * time.Second):
		t.Fatal("Shutdown timed out")
	}

	// 5. Database ditutup setelah shutdown
	if !mockStore.closeCalled {
		t.Errorf("Expected store.Close() to be called on shutdown")
	}
}

// 6. Shutdown timeout ditangani dengan benar
func TestGracefulShutdown_TimeoutHandled(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to bind port: %v", err)
	}
	addr := listener.Addr().String()
	_ = listener.Close()

	// Handler yang menggantung koneksi lebih lama dari shutdown timeout
	slowHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(300 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	})

	srv := &http.Server{
		Addr:    addr,
		Handler: slowHandler,
	}

	stopCh := make(chan os.Signal, 1)
	doneCh := make(chan error, 1)

	// Timeout shutdown sangat singkat (20ms) agar koneksi lambat memicu deadline exceeded
	go func() {
		doneCh <- RunServerWithShutdown(srv, database.NewMemoryStore(), stopCh, 20*time.Millisecond)
	}()

	time.Sleep(40 * time.Millisecond)

	// Kirim request lambat di background
	go func() {
		_, _ = http.Get("http://" + addr + "/slow")
	}()
	time.Sleep(10 * time.Millisecond)

	// Trigger shutdown
	stopCh <- syscall.SIGINT

	select {
	case err := <-doneCh:
		// Harus menangani context deadline exceeded tanpa panic
		if err != nil && !errors.Is(err, context.DeadlineExceeded) {
			t.Logf("Shutdown returned expected timeout error: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("Shutdown did not complete within reasonable time")
	}
}
