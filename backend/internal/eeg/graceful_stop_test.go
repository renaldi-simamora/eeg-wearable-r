package eeg_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"eeg-backend/internal/database"
	"eeg-backend/internal/eeg"
	"eeg-backend/internal/sessions"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/models"
)

// 1. Stop dari website menghasilkan STOP pada polling ESP32
func TestStopFromWebsite_ProducesStopOnPolling(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"
	userToken := engine.createTestUserToken(t, "user-demo-01", "researcher")

	// Set device online
	hwDev, _ := memStore.GetDeviceByID(deviceID)
	hwDev.Status = "connected"
	hwDev.LastSeen = time.Now()
	_ = memStore.UpdateDevice(hwDev)

	// Buat sesi live dari website
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
	sessionID := sesResp.Data.ID

	// Polling ESP32 sebelum stop -> START
	reqPoll1, _ := http.NewRequest(http.MethodGet, "/api/v1/eeg/device/status", nil)
	reqPoll1.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqPoll1.Header.Set("X-Device-ID", deviceID)
	wPoll1 := httptest.NewRecorder()
	engine.router.ServeHTTP(wPoll1, reqPoll1)

	var poll1 struct {
		Data models.DevicePollResponse `json:"data"`
	}
	_ = json.Unmarshal(wPoll1.Body.Bytes(), &poll1)
	if poll1.Data.Command != "START" || poll1.Data.SessionID != sessionID {
		t.Fatalf("Expected START command for session %s, got %+v", sessionID, poll1.Data)
	}

	// Website klik Stop Session
	reqStop, _ := http.NewRequest(http.MethodPost, "/api/sessions/"+sessionID+"/stop", nil)
	reqStop.Header.Set("Authorization", "Bearer "+userToken)
	wStop := httptest.NewRecorder()
	engine.router.ServeHTTP(wStop, reqStop)

	if wStop.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 on stop, got %d: %s", wStop.Code, wStop.Body.String())
	}

	// Status sesi di DB harus stop_requested (karena hardware live online)
	sesInDB, _ := memStore.GetSessionByID(sessionID)
	if sesInDB.Status != "stop_requested" {
		t.Fatalf("Expected session status 'stop_requested', got '%s'", sesInDB.Status)
	}

	// Polling ESP32 tanpa query param -> STOP
	reqPoll2, _ := http.NewRequest(http.MethodGet, "/api/v1/eeg/device/status", nil)
	reqPoll2.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqPoll2.Header.Set("X-Device-ID", deviceID)
	wPoll2 := httptest.NewRecorder()
	engine.router.ServeHTTP(wPoll2, reqPoll2)

	var poll2 struct {
		Data models.DevicePollResponse `json:"data"`
	}
	_ = json.Unmarshal(wPoll2.Body.Bytes(), &poll2)
	if poll2.Data.Command != "STOP" {
		t.Errorf("Expected command 'STOP' on polling, got '%s'", poll2.Data.Command)
	}
	if poll2.Data.HasActiveSession {
		t.Errorf("Expected has_active_session false during stop_requested")
	}
	if poll2.Data.SessionID != sessionID {
		t.Errorf("Expected session_id '%s', got '%s'", sessionID, poll2.Data.SessionID)
	}

	// Polling ESP32 dengan current_session_id -> STOP
	reqPoll3, _ := http.NewRequest(http.MethodGet, "/api/v1/eeg/device/status?current_session_id="+sessionID, nil)
	reqPoll3.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqPoll3.Header.Set("X-Device-ID", deviceID)
	wPoll3 := httptest.NewRecorder()
	engine.router.ServeHTTP(wPoll3, reqPoll3)

	var poll3 struct {
		Data models.DevicePollResponse `json:"data"`
	}
	_ = json.Unmarshal(wPoll3.Body.Bytes(), &poll3)
	if poll3.Data.Command != "STOP" {
		t.Errorf("Expected command 'STOP' with current_session_id, got '%s'", poll3.Data.Command)
	}
}

// 2. Batch terakhir masih dapat diterima selama status penghentian sementara (stop_requested)
func TestLastBatch_AcceptedDuringStopRequested(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"
	userToken := engine.createTestUserToken(t, "user-demo-01", "researcher")

	hwDev, _ := memStore.GetDeviceByID(deviceID)
	hwDev.Status = "connected"
	hwDev.LastSeen = time.Now()
	_ = memStore.UpdateDevice(hwDev)

	// Mulai sesi
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
	sessionID := sesResp.Data.ID

	// Web klik stop -> status menjadi stop_requested
	reqStop, _ := http.NewRequest(http.MethodPost, "/api/sessions/"+sessionID+"/stop", nil)
	reqStop.Header.Set("Authorization", "Bearer "+userToken)
	wStop := httptest.NewRecorder()
	engine.router.ServeHTTP(wStop, reqStop)

	if wStop.Code != http.StatusOK {
		t.Fatalf("Stop failed: %d", wStop.Code)
	}

	// ESP32 mengirim flush sisa buffer batch EEG terakhir
	sq := 10
	batchReq := models.DeviceBatchSamplesRequest{
		DeviceID:      deviceID,
		SessionID:     sessionID,
		StartIndex:    100,
		SampleCount:   6,
		SignalQuality: &sq,
		Samples:       []int16{120, 125, 130, 115, 110, 105},
		BandPower: &models.DeviceBandPower{
			Delta: 1000,
			Theta: 2000,
			Alpha: 5000,
			Beta:  1500,
			Gamma: 500,
		},
	}
	batchBytes, _ := json.Marshal(batchReq)
	reqBatch, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/samples", bytes.NewBuffer(batchBytes))
	reqBatch.Header.Set("Content-Type", "application/json")
	reqBatch.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqBatch.Header.Set("X-Device-ID", deviceID)
	wBatch := httptest.NewRecorder()
	engine.router.ServeHTTP(wBatch, reqBatch)

	if wBatch.Code != http.StatusOK && wBatch.Code != http.StatusCreated {
		t.Fatalf("Expected HTTP 200/201 for last batch during stop_requested, got %d: %s", wBatch.Code, wBatch.Body.String())
	}

	// Verifikasi sampel tersimpan di store
	samples, err := memStore.GetEEGSamples(sessionID)
	if err != nil || len(samples) != 6 {
		t.Fatalf("Expected 6 samples persisted in DB, got %d (err: %v)", len(samples), err)
	}
}

// 3. Batch ditolak setelah sesi completed
func TestBatch_RejectedAfterSessionCompleted(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"

	// Buat sesi yang sudah completed
	sessionID := "ses-already-completed"
	ses := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        deviceID,
		Title:           "Sesi Selesai",
		AcquisitionMode: "live",
		Status:          "completed",
		StartedAt:       time.Now().Add(-10 * time.Minute),
		CreatedAt:       time.Now().Add(-10 * time.Minute),
	}
	_ = memStore.CreateSession(ses)

	sq := 10
	batchReq := models.DeviceBatchSamplesRequest{
		DeviceID:      deviceID,
		SessionID:     sessionID,
		StartIndex:    500,
		SampleCount:   3,
		SignalQuality: &sq,
		Samples:       []int16{50, 60, 70},
	}
	batchBytes, _ := json.Marshal(batchReq)
	reqBatch, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/samples", bytes.NewBuffer(batchBytes))
	reqBatch.Header.Set("Content-Type", "application/json")
	reqBatch.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqBatch.Header.Set("X-Device-ID", deviceID)
	wBatch := httptest.NewRecorder()
	engine.router.ServeHTTP(wBatch, reqBatch)

	if wBatch.Code != http.StatusBadRequest {
		t.Fatalf("Expected HTTP 400 Bad Request for batch after completed, got %d: %s", wBatch.Code, wBatch.Body.String())
	}
}

// 4. DeviceFinishSession menyelesaikan sesi yang stop_requested
func TestDeviceFinishSession_CompletesStopRequestedSession(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"

	sessionID := "ses-finishing-001"
	ses := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        deviceID,
		Title:           "Sesi Stop Requested",
		AcquisitionMode: "live",
		Status:          "stop_requested",
		StartedAt:       time.Now().Add(-60 * time.Second),
		CreatedAt:       time.Now().Add(-60 * time.Second),
	}
	_ = memStore.CreateSession(ses)

	finishReq := models.DeviceSessionFinishRequest{
		DeviceID:        deviceID,
		SessionID:       sessionID,
		DurationSeconds: 60,
	}
	finishBytes, _ := json.Marshal(finishReq)
	reqFinish, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/sessions/finish", bytes.NewBuffer(finishBytes))
	reqFinish.Header.Set("Content-Type", "application/json")
	reqFinish.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqFinish.Header.Set("X-Device-ID", deviceID)
	wFinish := httptest.NewRecorder()
	engine.router.ServeHTTP(wFinish, reqFinish)

	if wFinish.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 on device finish, got %d: %s", wFinish.Code, wFinish.Body.String())
	}

	// Verifikasi status berubah menjadi completed
	finalSes, _ := memStore.GetSessionByID(sessionID)
	if finalSes.Status != "completed" {
		t.Errorf("Expected session status 'completed', got '%s'", finalSes.Status)
	}
	if finalSes.Duration != 60 {
		t.Errorf("Expected duration 60, got %d", finalSes.Duration)
	}
}

// 5. DeviceFinishSession tidak dapat memfinalisasi sesi milik perangkat lain
func TestDeviceFinishSession_RejectsOtherDeviceSession(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	ownerDevice := "esp32-eeg-gateway-01"
	attackerDevice := "esp32-attacker-99"

	sessionID := "ses-protected-owner"
	ses := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        ownerDevice,
		Title:           "Sesi Milik Owner",
		AcquisitionMode: "live",
		Status:          "stop_requested",
		StartedAt:       time.Now().Add(-30 * time.Second),
		CreatedAt:       time.Now().Add(-30 * time.Second),
	}
	_ = memStore.CreateSession(ses)

	finishReq := models.DeviceSessionFinishRequest{
		DeviceID:        attackerDevice,
		SessionID:       sessionID,
		DurationSeconds: 30,
	}
	finishBytes, _ := json.Marshal(finishReq)
	reqFinish, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/sessions/finish", bytes.NewBuffer(finishBytes))
	reqFinish.Header.Set("Content-Type", "application/json")
	reqFinish.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqFinish.Header.Set("X-Device-ID", attackerDevice)
	wFinish := httptest.NewRecorder()
	engine.router.ServeHTTP(wFinish, reqFinish)

	if wFinish.Code == http.StatusOK {
		t.Fatalf("Expected error when finishing other device's session, got HTTP 200")
	}

	// Sesi harus tetap stop_requested, tidak berubah
	sesCheck, _ := memStore.GetSessionByID(sessionID)
	if sesCheck.Status != "stop_requested" {
		t.Errorf("Expected session to remain 'stop_requested', got '%s'", sesCheck.Status)
	}
}

// 6. Stop berulang tidak merusak status sesi (idempotent, second stop keeps stop_requested)
func TestRepeatedStop_IdempotentAndSafe(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"
	userToken := engine.createTestUserToken(t, "user-demo-01", "researcher")

	hwDev, _ := memStore.GetDeviceByID(deviceID)
	hwDev.Status = "connected"
	hwDev.LastSeen = time.Now()
	_ = memStore.UpdateDevice(hwDev)

	// Buat sesi live
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
	sessionID := sesResp.Data.ID

	// Stop ke-1: Transisi ke stop_requested (graceful handshake)
	reqStop1, _ := http.NewRequest(http.MethodPost, "/api/sessions/"+sessionID+"/stop", nil)
	reqStop1.Header.Set("Authorization", "Bearer "+userToken)
	wStop1 := httptest.NewRecorder()
	engine.router.ServeHTTP(wStop1, reqStop1)
	if wStop1.Code != http.StatusOK {
		t.Fatalf("Stop 1 failed: %d", wStop1.Code)
	}

	sesAfter1, _ := memStore.GetSessionByID(sessionID)
	if sesAfter1.Status != "stop_requested" {
		t.Fatalf("Expected stop_requested after stop 1, got '%s'", sesAfter1.Status)
	}

	// Stop ke-2: User menekan stop lagi saat stop_requested -> tetap stop_requested, idempoten!
	reqStop2, _ := http.NewRequest(http.MethodPost, "/api/sessions/"+sessionID+"/stop", nil)
	reqStop2.Header.Set("Authorization", "Bearer "+userToken)
	wStop2 := httptest.NewRecorder()
	engine.router.ServeHTTP(wStop2, reqStop2)
	if wStop2.Code != http.StatusOK {
		t.Fatalf("Stop 2 failed: %d", wStop2.Code)
	}

	sesAfter2, _ := memStore.GetSessionByID(sessionID)
	if sesAfter2.Status != "stop_requested" {
		t.Fatalf("Expected stop_requested after stop 2 (idempotent), got '%s'", sesAfter2.Status)
	}

	// Stop ke-3: Tetap stop_requested
	reqStop3, _ := http.NewRequest(http.MethodPost, "/api/sessions/"+sessionID+"/stop", nil)
	reqStop3.Header.Set("Authorization", "Bearer "+userToken)
	wStop3 := httptest.NewRecorder()
	engine.router.ServeHTTP(wStop3, reqStop3)
	if wStop3.Code != http.StatusOK {
		t.Fatalf("Stop 3 failed: %d", wStop3.Code)
	}

	sesAfter3, _ := memStore.GetSessionByID(sessionID)
	if sesAfter3.Status != "stop_requested" {
		t.Fatalf("Expected stop_requested after stop 3, got '%s'", sesAfter3.Status)
	}

	// ESP32 memanggil Finish -> baru berubah menjadi completed!
	finishReq := models.DeviceSessionFinishRequest{
		DeviceID:        deviceID,
		SessionID:       sessionID,
		DurationSeconds: 15,
	}
	finishBytes, _ := json.Marshal(finishReq)
	reqFinish, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/sessions/finish", bytes.NewBuffer(finishBytes))
	reqFinish.Header.Set("Content-Type", "application/json")
	reqFinish.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqFinish.Header.Set("X-Device-ID", deviceID)
	wFinish := httptest.NewRecorder()
	engine.router.ServeHTTP(wFinish, reqFinish)
	if wFinish.Code != http.StatusOK {
		t.Fatalf("Finish failed: %d", wFinish.Code)
	}

	sesAfterFinish, _ := memStore.GetSessionByID(sessionID)
	if sesAfterFinish.Status != "completed" {
		t.Fatalf("Expected completed after ESP32 finish, got '%s'", sesAfterFinish.Status)
	}

	// Stop ke-4 setelah completed -> idempotent completed
	reqStop4, _ := http.NewRequest(http.MethodPost, "/api/sessions/"+sessionID+"/stop", nil)
	reqStop4.Header.Set("Authorization", "Bearer "+userToken)
	wStop4 := httptest.NewRecorder()
	engine.router.ServeHTTP(wStop4, reqStop4)
	if wStop4.Code != http.StatusOK {
		t.Fatalf("Stop 4 failed: %d", wStop4.Code)
	}

	sesAfter4, _ := memStore.GetSessionByID(sessionID)
	if sesAfter4.Status != "completed" {
		t.Fatalf("Expected completed after stop 4, got '%s'", sesAfter4.Status)
	}
}

// 7. Perangkat offline saat Stop ditangani secara aman (finalizes immediately to completed)
func TestStopSession_DeviceOffline_FinalizesImmediately(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"
	userToken := engine.createTestUserToken(t, "user-demo-01", "researcher")

	// Mulai sesi saat online
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
	sessionID := sesResp.Data.ID

	// Sekarang perangkat putus koneksi / offline (>60s tidak ada heartbeat)
	hwDev.LastSeen = time.Now().Add(-5 * time.Minute)
	hwDev.Status = "disconnected"
	_ = memStore.UpdateDevice(hwDev)

	// User klik Stop Session dari website
	reqStop, _ := http.NewRequest(http.MethodPost, "/api/sessions/"+sessionID+"/stop", nil)
	reqStop.Header.Set("Authorization", "Bearer "+userToken)
	wStop := httptest.NewRecorder()
	engine.router.ServeHTTP(wStop, reqStop)

	if wStop.Code != http.StatusOK {
		t.Fatalf("Expected HTTP 200 on stop, got %d: %s", wStop.Code, wStop.Body.String())
	}

	// Karena device offline, sesi langsung menjadi completed, tidak menggantung di stop_requested
	sesCheck, _ := memStore.GetSessionByID(sessionID)
	if sesCheck.Status != "completed" {
		t.Errorf("Expected offline device session to immediately finalize to 'completed', got '%s'", sesCheck.Status)
	}
}

// 8. Sesi tidak bisa menerima batch setelah finalisasi (strictly rejected)
func TestBatch_StrictlyRejectedAfterFinalization(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"
	userToken := engine.createTestUserToken(t, "user-demo-01", "researcher")

	hwDev, _ := memStore.GetDeviceByID(deviceID)
	hwDev.Status = "connected"
	hwDev.LastSeen = time.Now()
	_ = memStore.UpdateDevice(hwDev)

	// Siklus lengkap: Start -> Stop (stop_requested) -> Last Batch -> Finish (completed) -> Next Batch (REJECTED)
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
	sessionID := sesResp.Data.ID

	// Web Stop
	reqStop, _ := http.NewRequest(http.MethodPost, "/api/sessions/"+sessionID+"/stop", nil)
	reqStop.Header.Set("Authorization", "Bearer "+userToken)
	wStop := httptest.NewRecorder()
	engine.router.ServeHTTP(wStop, reqStop)

	// ESP32 mengirim batch terakhir
	sq := 0
	lastBatch := models.DeviceBatchSamplesRequest{
		DeviceID:      deviceID,
		SessionID:     sessionID,
		StartIndex:    100,
		SampleCount:   3,
		SignalQuality: &sq,
		Samples:       []int16{200, 210, 220},
	}
	lastBytes, _ := json.Marshal(lastBatch)
	reqLast, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/samples", bytes.NewBuffer(lastBytes))
	reqLast.Header.Set("Content-Type", "application/json")
	reqLast.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqLast.Header.Set("X-Device-ID", deviceID)
	wLast := httptest.NewRecorder()
	engine.router.ServeHTTP(wLast, reqLast)

	if wLast.Code != http.StatusOK && wLast.Code != http.StatusCreated {
		t.Fatalf("Expected last batch to succeed, got %d: %s", wLast.Code, wLast.Body.String())
	}

	// ESP32 memanggil Finish
	finishReq := models.DeviceSessionFinishRequest{
		DeviceID:        deviceID,
		SessionID:       sessionID,
		DurationSeconds: 15,
	}
	finishBytes, _ := json.Marshal(finishReq)
	reqFinish, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/sessions/finish", bytes.NewBuffer(finishBytes))
	reqFinish.Header.Set("Content-Type", "application/json")
	reqFinish.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqFinish.Header.Set("X-Device-ID", deviceID)
	wFinish := httptest.NewRecorder()
	engine.router.ServeHTTP(wFinish, reqFinish)

	if wFinish.Code != http.StatusOK {
		t.Fatalf("Expected finish to succeed, got %d: %s", wFinish.Code, wFinish.Body.String())
	}

	// Verifikasi status adalah completed
	sesDone, _ := memStore.GetSessionByID(sessionID)
	if sesDone.Status != "completed" {
		t.Fatalf("Expected completed status, got '%s'", sesDone.Status)
	}

	// Batch terlambat berikutnya DITOLAK
	lateBatch := models.DeviceBatchSamplesRequest{
		DeviceID:      deviceID,
		SessionID:     sessionID,
		StartIndex:    103,
		SampleCount:   2,
		SignalQuality: &sq,
		Samples:       []int16{230, 240},
	}
	lateBytes, _ := json.Marshal(lateBatch)
	reqLate, _ := http.NewRequest(http.MethodPost, "/api/v1/eeg/samples", bytes.NewBuffer(lateBytes))
	reqLate.Header.Set("Content-Type", "application/json")
	reqLate.Header.Set("X-Device-API-Key", engine.deviceAPIKey)
	reqLate.Header.Set("X-Device-ID", deviceID)
	wLate := httptest.NewRecorder()
	engine.router.ServeHTTP(wLate, reqLate)

	if wLate.Code != http.StatusBadRequest {
		t.Fatalf("Expected late batch to be strictly rejected with HTTP 400, got %d: %s", wLate.Code, wLate.Body.String())
	}
}

// 9. Watchdog tidak memfinalisasi sesi yang sudah completed & tidak melakukan klasifikasi berulang
func TestWatchdog_DoesNotFinalizeCompletedSession(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	sesSvc := sessions.NewService(memStore, hub, nil)
	// Gunakan timeout singkat untuk pengujian
	sesSvc.SetGracefulStopTimeout(40 * time.Millisecond)

	deviceID := "esp32-eeg-gateway-01"
	hwDev, _ := memStore.GetDeviceByID(deviceID)
	hwDev.Status = "connected"
	hwDev.LastSeen = time.Now()
	_ = memStore.UpdateDevice(hwDev)

	// Buat sesi live
	ses, err := sesSvc.Create("user-demo-01", &models.CreateSessionRequest{
		DeviceID:        deviceID,
		AcquisitionMode: "live",
		TargetBand:      "ALPHA",
	})
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	// Stop sesi -> status menjadi stop_requested dan watchdog 40ms menyala
	stoppedSes, err := sesSvc.Stop(ses.ID)
	if err != nil || stoppedSes.Status != "stop_requested" {
		t.Fatalf("Expected stop_requested, got status %v, err %v", stoppedSes, err)
	}

	// ESP32 memanggil Finalize dalam 10ms sebelum watchdog bangun
	time.Sleep(10 * time.Millisecond)
	finishedSes, transitioned, err := memStore.FinalizeSession(ses.ID)
	if err != nil || !transitioned || finishedSes.Status != "completed" {
		t.Fatalf("Expected transition to completed, got transitioned=%v, status=%s", transitioned, finishedSes.Status)
	}

	// Tunggu 80ms agar watchdog bangun dan memeriksa sesi
	time.Sleep(80 * time.Millisecond)

	// Verifikasi bahwa sesi tetap completed dan tidak terjadi double-finalize
	afterWatchdog, _ := memStore.GetSessionByID(ses.ID)
	if afterWatchdog.Status != "completed" {
		t.Errorf("Expected completed status, got '%s'", afterWatchdog.Status)
	}
}

// 10. Startup recovery hanya memfinalisasi sesi stop_requested yang melewati batas usia (>2 menit)
func TestStartupRecovery_RecoversStaleSessionsOnly(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	sesSvc := sessions.NewService(memStore, hub, nil)

	now := time.Now()
	staleEnded := now.Add(-5 * time.Minute)
	freshEnded := now.Add(-20 * time.Second)

	// 1. Sesi usang (>2 menit)
	staleSes := &models.Session{
		ID:              "ses-stale-orphaned",
		UserID:          "user-demo-01",
		DeviceID:        "esp32-eeg-gateway-01",
		Status:          "stop_requested",
		AcquisitionMode: "live",
		StartedAt:       now.Add(-10 * time.Minute),
		EndedAt:         &staleEnded,
		Duration:        300,
		CreatedAt:       now.Add(-10 * time.Minute),
	}
	_ = memStore.CreateSession(staleSes)

	// 2. Sesi baru (<2 menit)
	freshSes := &models.Session{
		ID:              "ses-fresh-handshake",
		UserID:          "user-demo-01",
		DeviceID:        "esp32-eeg-gateway-01",
		Status:          "stop_requested",
		AcquisitionMode: "live",
		StartedAt:       now.Add(-40 * time.Second),
		EndedAt:         &freshEnded,
		Duration:        20,
		CreatedAt:       now.Add(-40 * time.Second),
	}
	_ = memStore.CreateSession(freshSes)

	// 3. Sesi yang sudah completed sebelumnya
	alreadyCompleted := &models.Session{
		ID:              "ses-already-completed-old",
		UserID:          "user-demo-01",
		DeviceID:        "esp32-eeg-gateway-01",
		Status:          "completed",
		AcquisitionMode: "live",
		StartedAt:       now.Add(-20 * time.Minute),
		Duration:        600,
		CreatedAt:       now.Add(-20 * time.Minute),
	}
	_ = memStore.CreateSession(alreadyCompleted)

	// Jalankan recovery dengan cutoff 2 menit
	recovered, err := sesSvc.RecoverStaleSessions(2 * time.Minute)
	if err != nil {
		t.Fatalf("Recovery failed: %v", err)
	}

	// Hanya sesi usang yang boleh dipulihkan
	if len(recovered) != 1 {
		t.Fatalf("Expected exactly 1 recovered session, got %d", len(recovered))
	}
	if recovered[0].ID != "ses-stale-orphaned" {
		t.Errorf("Expected ses-stale-orphaned to be recovered, got %s", recovered[0].ID)
	}

	// Verifikasi di database:
	// Sesi usang harus menjadi completed
	s1, _ := memStore.GetSessionByID("ses-stale-orphaned")
	if s1.Status != "completed" {
		t.Errorf("Expected stale session to be completed, got '%s'", s1.Status)
	}

	// Sesi baru harus TETAP stop_requested
	s2, _ := memStore.GetSessionByID("ses-fresh-handshake")
	if s2.Status != "stop_requested" {
		t.Errorf("Expected fresh session to remain 'stop_requested', got '%s'", s2.Status)
	}

	// Sesi yang sudah completed tidak boleh disentuh
	s3, _ := memStore.GetSessionByID("ses-already-completed-old")
	if s3.Status != "completed" {
		t.Errorf("Expected completed session to stay completed, got '%s'", s3.Status)
	}
}

// 11. Uji kondisi pacu (Race Condition): Concurrency antara Watchdog, Finish, dan Repeated Stop
func TestConcurrent_FinishAndWatchdog(t *testing.T) {
	memStore := database.NewMemoryStore()
	sessionID := "ses-race-atomic-finish"

	now := time.Now()
	ses := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        "esp32-eeg-gateway-01",
		Status:          "stop_requested",
		AcquisitionMode: "live",
		StartedAt:       now.Add(-30 * time.Second),
		Duration:        30,
		CreatedAt:       now.Add(-30 * time.Second),
	}
	_ = memStore.CreateSession(ses)

	// Luncurkan 20 pemanggil FinalizeSession secara bersamaan
	concurrency := 20
	var wg sync.WaitGroup
	transitionCount := 0
	var mu sync.Mutex

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, transitioned, err := memStore.FinalizeSession(sessionID)
			if err != nil {
				t.Errorf("Finalize error: %v", err)
				return
			}
			if transitioned {
				mu.Lock()
				transitionCount++
				mu.Unlock()
			}
		}()
	}

	wg.Wait()

	// TEPAT 1 pemanggil yang berhasil melakukan transisi!
	if transitionCount != 1 {
		t.Errorf("Expected exactly 1 goroutine to transition session, got %d", transitionCount)
	}

	finalSes, _ := memStore.GetSessionByID(sessionID)
	if finalSes.Status != "completed" {
		t.Errorf("Expected session status completed, got '%s'", finalSes.Status)
	}
}

// 12. Uji kondisi pacu: Concurrency antara Startup Recovery dan Device Finish
func TestConcurrent_RecoveryAndFinish(t *testing.T) {
	memStore := database.NewMemoryStore()
	sessionID := "ses-race-recovery-finish"

	now := time.Now()
	staleEnded := now.Add(-5 * time.Minute)
	ses := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        "esp32-eeg-gateway-01",
		Status:          "stop_requested",
		AcquisitionMode: "live",
		StartedAt:       now.Add(-10 * time.Minute),
		EndedAt:         &staleEnded,
		Duration:        300,
		CreatedAt:       now.Add(-10 * time.Minute),
	}
	_ = memStore.CreateSession(ses)

	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		_, _ = memStore.RecoverStaleStopRequestedSessions(2 * time.Minute)
	}()

	go func() {
		defer wg.Done()
		_, _, _ = memStore.FinalizeSession(sessionID)
	}()

	wg.Wait()

	finalSes, _ := memStore.GetSessionByID(sessionID)
	if finalSes.Status != "completed" {
		t.Errorf("Expected completed status, got '%s'", finalSes.Status)
	}
}

// 13. Periodic recovery worker memulihkan sesi usang setelah interval ticker menyala
func TestPeriodicRecovery_RecoversAfterInterval(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	sesSvc := sessions.NewService(memStore, hub, nil)

	// Mulai periodic recovery dengan interval 20ms dan cutoff 50ms
	sesSvc.StartPeriodicRecovery(20*time.Millisecond, 50*time.Millisecond)
	defer sesSvc.StopPeriodicRecovery()

	if !sesSvc.IsRecoveryRunning() {
		t.Fatal("Expected periodic recovery to be running")
	}

	// Buat sesi usang
	now := time.Now()
	staleEnded := now.Add(-100 * time.Millisecond)
	ses := &models.Session{
		ID:              "ses-periodic-stale",
		UserID:          "user-demo-01",
		DeviceID:        "esp32-eeg-gateway-01",
		Status:          "stop_requested",
		AcquisitionMode: "live",
		StartedAt:       now.Add(-200 * time.Millisecond),
		EndedAt:         &staleEnded,
		Duration:        1,
		CreatedAt:       now.Add(-200 * time.Millisecond),
	}
	_ = memStore.CreateSession(ses)

	// Tunggu interval berkala menyala (60ms > 20ms interval)
	time.Sleep(60 * time.Millisecond)

	recoveredSes, _ := memStore.GetSessionByID("ses-periodic-stale")
	if recoveredSes.Status != "completed" {
		t.Errorf("Expected session to be recovered to 'completed', got '%s'", recoveredSes.Status)
	}
}

// 14. Periodic recovery worker tidak berjalan ganda dan berhenti bersih saat shutdown
func TestPeriodicRecovery_IdempotentStartAndCleanShutdown(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	sesSvc := sessions.NewService(memStore, hub, nil)

	// Panggil Start berulang kali
	sesSvc.StartPeriodicRecovery(20*time.Millisecond, 50*time.Millisecond)
	sesSvc.StartPeriodicRecovery(20*time.Millisecond, 50*time.Millisecond)

	if !sesSvc.IsRecoveryRunning() {
		t.Fatal("Expected periodic recovery to be running")
	}

	// Hentikan worker
	sesSvc.StopPeriodicRecovery()
	if sesSvc.IsRecoveryRunning() {
		t.Fatal("Expected periodic recovery to be stopped")
	}

	// Panggilan stop kedua kalinya harus aman (no-op)
	sesSvc.StopPeriodicRecovery()
}

// 15. Concurrency: Multiple call Stop Session secara bersamaan
func TestConcurrent_MultipleStopCalls(t *testing.T) {
	memStore, engine := setupTestRouterAndStore()
	deviceID := "esp32-eeg-gateway-01"
	userToken := engine.createTestUserToken(t, "user-demo-01", "researcher")

	hwDev, _ := memStore.GetDeviceByID(deviceID)
	hwDev.Status = "connected"
	hwDev.LastSeen = time.Now()
	_ = memStore.UpdateDevice(hwDev)

	// Buat sesi live
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
	sessionID := sesResp.Data.ID

	// Luncurkan 20 goroutine memanggil endpoint Stop secara bersamaan
	concurrency := 20
	var wg sync.WaitGroup
	wg.Add(concurrency)

	for i := 0; i < concurrency; i++ {
		go func() {
			defer wg.Done()
			reqStop, _ := http.NewRequest(http.MethodPost, "/api/sessions/"+sessionID+"/stop", nil)
			reqStop.Header.Set("Authorization", "Bearer "+userToken)
			wStop := httptest.NewRecorder()
			engine.router.ServeHTTP(wStop, reqStop)
			if wStop.Code != http.StatusOK {
				t.Errorf("Expected 200 OK on concurrent stop, got %d", wStop.Code)
			}
		}()
	}

	wg.Wait()

	// Sesi harus tetap berstatus stop_requested yang valid dan konsisten
	finalSes, err := memStore.GetSessionByID(sessionID)
	if err != nil || finalSes.Status != "stop_requested" {
		t.Fatalf("Expected status 'stop_requested', got '%s', err %v", finalSes.Status, err)
	}
}

// 16. Ingestion: Validasi batas maksimum sample_count > 2048 ditolak
func TestIngestDeviceBatch_SampleCountExceeds2048_Rejected(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	eegSvc := eeg.NewService(memStore, hub)

	// Buat sesi running
	now := time.Now()
	ses := &models.Session{
		ID:              "ses-sample-limit",
		UserID:          "user-demo-01",
		DeviceID:        "esp32-eeg-gateway-01",
		Status:          "running",
		AcquisitionMode: "live",
		StartedAt:       now,
		CreatedAt:       now,
	}
	_ = memStore.CreateSession(ses)

	// Request dengan 2049 sampel (> 2048)
	samples := make([]int16, 2049)
	req := &models.DeviceBatchSamplesRequest{
		SessionID:   "ses-sample-limit",
		DeviceID:    "esp32-eeg-gateway-01",
		SampleCount: 2049,
		Samples:     samples,
	}

	count, err := eegSvc.IngestDeviceBatch(req)
	if err == nil || count != 0 {
		t.Fatalf("Expected rejection when sample count exceeds 2048, got count=%d, err=%v", count, err)
	}
}
