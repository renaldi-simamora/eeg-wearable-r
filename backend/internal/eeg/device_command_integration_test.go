package eeg_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"eeg-backend/config"
	"eeg-backend/internal/database"
	"eeg-backend/internal/middleware"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/models"
	"eeg-backend/routes"
)

func setupTestRouterAndStore() (*database.MemoryStore, *routesEngine) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	cfg := &config.Config{
		JWTSecret:    "test-jwt-secret-minimum-32-characters-for-testing",
		DeviceAPIKey: "eeg-device-secret-key-academic-2026",
		CORSOrigin:   "*",
	}
	router := routes.SetupRouter(cfg, memStore, hub)
	return memStore, &routesEngine{
		router:       router,
		deviceAPIKey: cfg.DeviceAPIKey,
		jwtSecret:    cfg.JWTSecret,
		store:        memStore,
	}
}

type routesEngine struct {
	router       http.Handler
	deviceAPIKey string
	jwtSecret    string
	store        database.Store
}

func (e *routesEngine) createTestUserToken(t *testing.T, userID, role string) string {
	token, err := middleware.GenerateToken(&models.User{
		ID:    userID,
		Email: "user@neuropulse.test",
		Role:  role,
	}, e.jwtSecret)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}
	return token
}

// 1. Device polling tanpa sesi aktif menghasilkan IDLE dan memperbarui heartbeat LastSeen
func TestDevicePolling_NoActiveSession_ReturnsIdle(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"

	// Pastikan device terdaftar
	dev, _ := memStore.GetDeviceByID(deviceID)
	oldLastSeen := time.Now().Add(-10 * time.Minute)
	if dev != nil {
		dev.LastSeen = oldLastSeen
		_ = memStore.UpdateDevice(dev)
	}

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/eeg/device/status", nil)
	req.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	req.Header.Set("X-Device-ID", deviceID)

	w := httptest.NewRecorder()
	engine.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Success bool                      `json:"success"`
		Data    models.DevicePollResponse `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if !resp.Success {
		t.Errorf("Expected success true")
	}
	if resp.Data.Command != "IDLE" {
		t.Errorf("Expected command 'IDLE', got '%s'", resp.Data.Command)
	}
	if resp.Data.HasActiveSession {
		t.Errorf("Expected has_active_session false")
	}
	if resp.Data.SessionID != "" {
		t.Errorf("Expected empty session_id, got '%s'", resp.Data.SessionID)
	}

	// Verifikasi heartbeat LastSeen diperbarui pada saat polling
	updatedDev, err := memStore.GetDeviceByID(deviceID)
	if err != nil || updatedDev == nil {
		t.Fatalf("Device not found after polling: %v", err)
	}
	if updatedDev.LastSeen.Equal(oldLastSeen) || updatedDev.LastSeen.Before(oldLastSeen) {
		t.Errorf("Heartbeat failure: LastSeen was not refreshed on polling")
	}
	if updatedDev.Status != "connected" {
		t.Errorf("Expected status 'connected', got '%s'", updatedDev.Status)
	}
}

// 2. Device polling dengan sesi aktif memperoleh session ID backend yang benar
func TestDevicePolling_WithActiveSession_ReturnsStartAndSessionID(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"

	// Buat sesi aktif di backend
	sessionID := "active-backend-session-001"
	activeSes := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        deviceID,
		Title:           "Sesi Riset Aktif",
		AcquisitionMode: "live",
		TargetBand:      "ALPHA",
		StartedAt:       time.Now(),
		Status:          "running",
		CreatedAt:       time.Now(),
	}
	_ = memStore.CreateSession(activeSes)

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/eeg/device/status", nil)
	req.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	req.Header.Set("X-Device-ID", deviceID)

	w := httptest.NewRecorder()
	engine.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Success bool                      `json:"success"`
		Data    models.DevicePollResponse `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Data.Command != "START" {
		t.Errorf("Expected command 'START', got '%s'", resp.Data.Command)
	}
	if !resp.Data.HasActiveSession {
		t.Errorf("Expected has_active_session true")
	}
	if resp.Data.SessionID != sessionID {
		t.Errorf("Expected session_id '%s', got '%s'", sessionID, resp.Data.SessionID)
	}
	if resp.Data.TargetBand != "ALPHA" {
		t.Errorf("Expected target_band 'ALPHA', got '%s'", resp.Data.TargetBand)
	}
}

// 3. Sesi live dapat dibuat ketika device online tanpa mensyaratkan stream EEG awal (solusi deadlock)
func TestLiveSessionCreation_OnlineWithoutPriorStream_Succeeds(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"

	// Pastikan hardware gateway online dengan heartbeat baru, tapi belum pernah streaming EEG
	hwDev, _ := memStore.GetDeviceByID(deviceID)
	hwDev.Status = "connected"
	hwDev.LastSeen = time.Now()
	hwDev.LastEEGStreamAt = nil
	_ = memStore.UpdateDevice(hwDev)

	userToken := engine.createTestUserToken(t, "user-demo-01", "researcher")

	createBody, _ := json.Marshal(models.CreateSessionRequest{
		DeviceID:        deviceID,
		Title:           "Uji Coba Live Online",
		AcquisitionMode: "live",
		TargetBand:      "BETA",
	})

	req, _ := http.NewRequest(http.MethodPost, "/api/sessions", bytes.NewBuffer(createBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+userToken)

	w := httptest.NewRecorder()
	engine.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK && w.Code != http.StatusCreated {
		t.Fatalf("Expected HTTP 200/201, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Success bool           `json:"success"`
		Data    models.Session `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Data.Status != "running" {
		t.Errorf("Expected status 'running', got '%s'", resp.Data.Status)
	}
	if resp.Data.AcquisitionMode != "live" {
		t.Errorf("Expected acquisition_mode 'live', got '%s'", resp.Data.AcquisitionMode)
	}
}

// 4. Sesi live ditolak ketika device offline
func TestLiveSessionCreation_OfflineDevice_Rejected(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"

	// Set device offline
	hwDev, _ := memStore.GetDeviceByID(deviceID)
	hwDev.Status = "disconnected"
	hwDev.LastSeen = time.Now().Add(-10 * time.Minute)
	_ = memStore.UpdateDevice(hwDev)

	userToken := engine.createTestUserToken(t, "user-demo-01", "researcher")

	createBody, _ := json.Marshal(models.CreateSessionRequest{
		DeviceID:        deviceID,
		AcquisitionMode: "live",
		TargetBand:      "ALPHA",
	})

	req, _ := http.NewRequest(http.MethodPost, "/api/sessions", bytes.NewBuffer(createBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+userToken)

	w := httptest.NewRecorder()
	engine.router.ServeHTTP(w, req)

	if w.Code == http.StatusOK || w.Code == http.StatusCreated {
		t.Fatalf("Expected failure when device is offline, got %d", w.Code)
	}
}

// 5. Device tidak dapat mengambil atau mengirim sampel ke sesi milik device lain
func TestDeviceIsolation_CannotAccessOtherDeviceSession(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()

	// Sesi milik Device A
	deviceA := "esp32-eeg-gateway-01"
	deviceB := "esp32-other-device-02"

	sesA := &models.Session{
		ID:              "session-device-a",
		UserID:          "user-demo-01",
		DeviceID:        deviceA,
		AcquisitionMode: "live",
		TargetBand:      "ALPHA",
		StartedAt:       time.Now(),
		Status:          "running",
	}
	_ = memStore.CreateSession(sesA)

	// Device B melakukan polling
	reqPoll, _ := http.NewRequest(http.MethodGet, "/api/v1/eeg/device/status", nil)
	reqPoll.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqPoll.Header.Set("X-Device-ID", deviceB)

	wPoll := httptest.NewRecorder()
	engine.router.ServeHTTP(wPoll, reqPoll)

	var respPoll struct {
		Data models.DevicePollResponse `json:"data"`
	}
	_ = json.Unmarshal(wPoll.Body.Bytes(), &respPoll)

	if respPoll.Data.HasActiveSession {
		t.Errorf("Device B incorrectly received active session belonging to Device A")
	}

	// Device B mencoba mengirim sampel ke session milik Device A
	sampleBody, _ := json.Marshal(models.DeviceBatchSamplesRequest{
		SessionID:   sesA.ID,
		DeviceID:    deviceB,
		StartIndex:  0,
		SampleCount: 1,
		Samples:     []int16{42},
	})
	reqIngest, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/samples", bytes.NewBuffer(sampleBody))
	reqIngest.Header.Set("Content-Type", "application/json")
	reqIngest.Header.Set("X-Device-API-Key", engine.deviceAPIKey)

	wIngest := httptest.NewRecorder()
	engine.router.ServeHTTP(wIngest, reqIngest)

	if wIngest.Code != http.StatusBadRequest {
		t.Errorf("Expected HTTP 400 when Device B tries to ingest to Device A session, got %d: %s", wIngest.Code, wIngest.Body.String())
	}
}

// 6. Sampel EEG diterima untuk session ID yang valid dan aktif
func TestEEGSamples_ValidAndActive_Accepted(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"

	sessionID := "valid-active-session-001"
	_ = memStore.CreateSession(&models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        deviceID,
		AcquisitionMode: "live",
		StartedAt:       time.Now(),
		Status:          "running",
	})

	sampleBody, _ := json.Marshal(models.DeviceBatchSamplesRequest{
		SessionID:   sessionID,
		DeviceID:    deviceID,
		StartIndex:  0,
		SampleCount: 3,
		Samples:     []int16{10, 20, 30},
	})

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/samples", bytes.NewBuffer(sampleBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Device-API-Key", engine.deviceAPIKey)

	w := httptest.NewRecorder()
	engine.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200, got %d: %s", w.Code, w.Body.String())
	}

	samples, _ := memStore.GetEEGSamples(sessionID)
	if len(samples) != 3 {
		t.Errorf("Expected 3 persisted samples, got %d", len(samples))
	}
}

// 7. Sampel EEG ditolak untuk session ID yang salah / tidak ada
func TestEEGSamples_InvalidSessionID_Rejected(t *testing.T) {
	_, engine := setupTestRouterAndStore()

	sampleBody, _ := json.Marshal(models.DeviceBatchSamplesRequest{
		SessionID:   "non-existent-session-id",
		DeviceID:    "esp32-eeg-gateway-01",
		StartIndex:  0,
		SampleCount: 1,
		Samples:     []int16{10},
	})

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/samples", bytes.NewBuffer(sampleBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Device-API-Key", engine.deviceAPIKey)

	w := httptest.NewRecorder()
	engine.router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound && w.Code != http.StatusBadRequest {
		t.Fatalf("Expected 404 or 400 for non-existent session, got %d: %s", w.Code, w.Body.String())
	}
}

// 8. Sampel ditolak setelah sesi dihentikan / selesai
func TestEEGSamples_RejectedAfterSessionStopped(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"
	sessionID := "stopped-session-001"

	ended := time.Now()
	_ = memStore.CreateSession(&models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        deviceID,
		AcquisitionMode: "live",
		StartedAt:       time.Now().Add(-5 * time.Minute),
		EndedAt:         &ended,
		Status:          "completed",
	})

	sampleBody, _ := json.Marshal(models.DeviceBatchSamplesRequest{
		SessionID:   sessionID,
		DeviceID:    deviceID,
		StartIndex:  0,
		SampleCount: 1,
		Samples:     []int16{10},
	})

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/samples", bytes.NewBuffer(sampleBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Device-API-Key", engine.deviceAPIKey)

	w := httptest.NewRecorder()
	engine.router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected HTTP 400 when sending samples to completed session, got %d: %s", w.Code, w.Body.String())
	}
}

// 9. Stop dari website terdeteksi melalui polling berikutnya
func TestStopFromWebsite_DetectedViaPolling(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"
	userToken := engine.createTestUserToken(t, "user-demo-01", "researcher")

	// 1. User memulai sesi dari web
	hwDev, _ := memStore.GetDeviceByID(deviceID)
	hwDev.Status = "connected"
	hwDev.LastSeen = time.Now()
	_ = memStore.UpdateDevice(hwDev)

	createBody, _ := json.Marshal(models.CreateSessionRequest{
		DeviceID:        deviceID,
		AcquisitionMode: "live",
		TargetBand:      "ALPHA",
	})
	reqCreate, _ := http.NewRequest(http.MethodPost, "/api/sessions", bytes.NewBuffer(createBody))
	reqCreate.Header.Set("Content-Type", "application/json")
	reqCreate.Header.Set("Authorization", "Bearer "+userToken)
	wCreate := httptest.NewRecorder()
	engine.router.ServeHTTP(wCreate, reqCreate)

	var sesResp struct {
		Data models.Session `json:"data"`
	}
	_ = json.Unmarshal(wCreate.Body.Bytes(), &sesResp)
	createdSessionID := sesResp.Data.ID

	// 2. Polling ESP32: mendeteksi sesi aktif
	reqPoll1, _ := http.NewRequest(http.MethodGet, "/api/v1/eeg/device/status", nil)
	reqPoll1.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqPoll1.Header.Set("X-Device-ID", deviceID)
	wPoll1 := httptest.NewRecorder()
	engine.router.ServeHTTP(wPoll1, reqPoll1)

	var poll1Resp struct {
		Data models.DevicePollResponse `json:"data"`
	}
	_ = json.Unmarshal(wPoll1.Body.Bytes(), &poll1Resp)
	if poll1Resp.Data.Command != "START" || poll1Resp.Data.SessionID != createdSessionID {
		t.Fatalf("Expected START with session ID %s, got %+v", createdSessionID, poll1Resp.Data)
	}

	// 3. User menghentikan sesi dari website
	reqStop, _ := http.NewRequest(http.MethodPost, "/api/sessions/"+createdSessionID+"/stop", nil)
	reqStop.Header.Set("Authorization", "Bearer "+userToken)
	wStop := httptest.NewRecorder()
	engine.router.ServeHTTP(wStop, reqStop)

	if wStop.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 on stop, got %d", wStop.Code)
	}

	// 4. Polling ESP32 berikutnya menyertakan session ID yang sedang berjalan
	reqPoll2, _ := http.NewRequest(http.MethodGet, "/api/v1/eeg/device/status?current_session_id="+createdSessionID, nil)
	reqPoll2.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqPoll2.Header.Set("X-Device-ID", deviceID)
	wPoll2 := httptest.NewRecorder()
	engine.router.ServeHTTP(wPoll2, reqPoll2)

	var poll2Resp struct {
		Data models.DevicePollResponse `json:"data"`
	}
	_ = json.Unmarshal(wPoll2.Body.Bytes(), &poll2Resp)

	if poll2Resp.Data.Command != "STOP" {
		t.Errorf("Expected command 'STOP' after session stop, got '%s'", poll2Resp.Data.Command)
	}
	if poll2Resp.Data.HasActiveSession {
		t.Errorf("Expected has_active_session false after stop")
	}
}

// 10. Tidak terjadi duplikasi sesi ketika sesi dibuat kembali
func TestNoDuplicateSession(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"
	userToken := engine.createTestUserToken(t, "user-demo-01", "researcher")

	hwDev, _ := memStore.GetDeviceByID(deviceID)
	hwDev.Status = "connected"
	hwDev.LastSeen = time.Now()
	_ = memStore.UpdateDevice(hwDev)

	// Buat Sesi 1
	createBody1, _ := json.Marshal(models.CreateSessionRequest{
		DeviceID:        deviceID,
		AcquisitionMode: "live",
		TargetBand:      "ALPHA",
	})
	req1, _ := http.NewRequest(http.MethodPost, "/api/sessions", bytes.NewBuffer(createBody1))
	req1.Header.Set("Content-Type", "application/json")
	req1.Header.Set("Authorization", "Bearer "+userToken)
	w1 := httptest.NewRecorder()
	engine.router.ServeHTTP(w1, req1)

	var ses1 struct {
		Data models.Session `json:"data"`
	}
	_ = json.Unmarshal(w1.Body.Bytes(), &ses1)

	// Buat Sesi 2 untuk device yang sama
	createBody2, _ := json.Marshal(models.CreateSessionRequest{
		DeviceID:        deviceID,
		AcquisitionMode: "live",
		TargetBand:      "BETA",
	})
	req2, _ := http.NewRequest(http.MethodPost, "/api/sessions", bytes.NewBuffer(createBody2))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+userToken)
	w2 := httptest.NewRecorder()
	engine.router.ServeHTTP(w2, req2)

	var ses2 struct {
		Data models.Session `json:"data"`
	}
	_ = json.Unmarshal(w2.Body.Bytes(), &ses2)

	// Verifikasi Sesi 1 otomatis di-stop sehingga tidak ada duplikasi running session
	oldSes, _ := memStore.GetSessionByID(ses1.Data.ID)
	if oldSes.Status != "completed" {
		t.Errorf("Expected previous session to be completed, got status '%s'", oldSes.Status)
	}

	newSes, _ := memStore.GetSessionByID(ses2.Data.ID)
	if newSes.Status != "running" {
		t.Errorf("Expected current session to be running, got status '%s'", newSes.Status)
	}

	// Device polling hanya akan mengembalikan Sesi 2 yang aktif
	activeSes, _ := memStore.GetActiveSessionByDevice(deviceID)
	if activeSes == nil || activeSes.ID != ses2.Data.ID {
		t.Errorf("Expected active session to be %s, got %+v", ses2.Data.ID, activeSes)
	}
}
