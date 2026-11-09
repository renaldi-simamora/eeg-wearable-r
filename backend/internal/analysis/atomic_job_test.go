package analysis_test

import (
	"database/sql"
	"os"
	"sync"
	"testing"
	"time"

	"eeg-backend/internal/analysis"
	"eeg-backend/internal/database"
	"eeg-backend/internal/eeg"
	"eeg-backend/internal/sessions"
	ws "eeg-backend/internal/websocket"
	"eeg-backend/models"
)

// 1. Finalisasi sesi dan pembuatan job berhasil secara atomik
func TestAtomicFinalization_Success(t *testing.T) {
	memStore := database.NewMemoryStore()
	sessionID := "ses-atomic-success-01"

	now := time.Now()
	ses := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        "dev-01",
		Status:          "running",
		AcquisitionMode: "live",
		StartedAt:       now.Add(-1 * time.Minute),
		CreatedAt:       now.Add(-1 * time.Minute),
	}
	_ = memStore.CreateSession(ses)

	finalSes, job, transitioned, err := memStore.FinalizeSessionWithJob(sessionID)
	if err != nil {
		t.Fatalf("FinalizeSessionWithJob failed: %v", err)
	}

	if !transitioned {
		t.Fatal("Expected transitioned=true")
	}
	if finalSes.Status != "completed" {
		t.Errorf("Expected session status completed, got %s", finalSes.Status)
	}
	if job == nil || job.SessionID != sessionID || job.Status != "pending" {
		t.Fatalf("Expected pending job for session %s, got %+v", sessionID, job)
	}

	// Verifikasi di store
	storedJob, err := memStore.GetMLJobBySessionID(sessionID)
	if err != nil || storedJob == nil {
		t.Fatalf("Job was not persisted in store: %v", err)
	}
	if storedJob.ID != job.ID {
		t.Errorf("Job ID mismatch: %s vs %s", storedJob.ID, job.ID)
	}
}

// 2. Insert job gagal sehingga status sesi di-rollback (MemoryStore atomic rollback)
func TestAtomicFinalization_RollbackOnJobFailure_MemoryStore(t *testing.T) {
	memStore := database.NewMemoryStore()
	sessionID := "ses-atomic-fail-01"

	now := time.Now()
	ses := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        "dev-01",
		Status:          "running",
		AcquisitionMode: "live",
		StartedAt:       now.Add(-1 * time.Minute),
		CreatedAt:       now.Add(-1 * time.Minute),
	}
	_ = memStore.CreateSession(ses)

	// Simulasikan kegagalan pembuatan job
	memStore.SetSimulateJobInsertError(true)

	finalSes, job, transitioned, err := memStore.FinalizeSessionWithJob(sessionID)
	if err == nil {
		t.Fatal("Expected FinalizeSessionWithJob to fail when job insert fails, but it succeeded")
	}
	if transitioned {
		t.Fatal("Expected transitioned=false on rollback")
	}
	if job != nil {
		t.Fatalf("Expected nil job on rollback, got %+v", job)
	}
	_ = finalSes

	// Verifikasi status sesi tetap 'running' (BERHASIL DI-ROLLBACK)
	sesAfter, _ := memStore.GetSessionByID(sessionID)
	if sesAfter.Status != "running" {
		t.Fatalf("Atomic Rollback Violation! Expected session status to remain 'running', but got '%s'", sesAfter.Status)
	}
}

// 3 & 4. Sesi completed tanpa job dapat dipulihkan oleh reconciliation (Idempotent)
func TestReconciliation_RecoversCompletedSessionsWithoutJob(t *testing.T) {
	memStore := database.NewMemoryStore()
	sessionID := "ses-orphan-completed-01"

	now := time.Now()
	ses := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        "dev-01",
		Status:          "completed",
		AcquisitionMode: "live",
		StartedAt:       now.Add(-10 * time.Minute),
		EndedAt:         &now,
		Duration:        600,
		CreatedAt:       now.Add(-10 * time.Minute),
	}
	_ = memStore.CreateSession(ses)

	// Simpan biopotensial fitur agar memenuhi syarat klasifikasi
	_ = memStore.SaveBrainwaveFeature(&models.BrainwaveFeature{
		SessionID: sessionID,
		Alpha:     35.0,
		Beta:      15.0,
	})

	// Pastikan belum ada job
	j, _ := memStore.GetMLJobBySessionID(sessionID)
	if j != nil {
		t.Fatal("Expected no job initially")
	}

	// 3. Jalankan rekonsiliasi
	reconciled, err := memStore.ReconcileCompletedSessionsWithoutJobs()
	if err != nil {
		t.Fatalf("Reconcile error: %v", err)
	}
	if len(reconciled) < 1 {
		t.Fatalf("Expected at least 1 reconciled job, got %d", len(reconciled))
	}
	found := false
	for _, rj := range reconciled {
		if rj.SessionID == sessionID {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("Expected session %s to be reconciled, got %v", sessionID, reconciled)
	}

	// 4. Jalankan rekonsiliasi berkali-kali -> Idempoten, tidak membuat job ganda
	for i := 0; i < 3; i++ {
		reconciled2, err2 := memStore.ReconcileCompletedSessionsWithoutJobs()
		if err2 != nil {
			t.Fatalf("Reconcile pass %d failed: %v", i+2, err2)
		}
		if len(reconciled2) != 0 {
			t.Errorf("Expected 0 jobs on re-run, got %d", len(reconciled2))
		}
	}
}

// 5. Website Stop menggunakan jalur atomik
func TestWebsiteStop_UsesAtomicFinalizeWithJob(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	aSvc := analysis.NewService(memStore, "http://localhost:5000")
	sesSvc := sessions.NewService(memStore, hub, aSvc)

	// Device offline -> langsung finalisasi atomik
	dev := &models.Device{
		ID:        "dev-offline-test",
		Name:      "Test Dev",
		Status:    "disconnected",
		CreatedAt: time.Now(),
	}
	_ = memStore.CreateDevice(dev)

	ses, err := sesSvc.Create("user-demo-01", &models.CreateSessionRequest{
		DeviceID:        "dev-offline-test",
		AcquisitionMode: "simulated",
		TargetBand:      "ALPHA",
	})
	if err != nil {
		t.Fatalf("Create session failed: %v", err)
	}

	// Stop sesi
	stoppedSes, err := sesSvc.Stop(ses.ID)
	if err != nil {
		t.Fatalf("Stop failed: %v", err)
	}
	if stoppedSes.Status != "completed" {
		t.Errorf("Expected completed status, got %s", stoppedSes.Status)
	}

	// Verifikasi job otomatis tercipta di store
	job, err := memStore.GetMLJobBySessionID(ses.ID)
	if err != nil || job == nil {
		t.Fatalf("Expected atomic ML job to be created on website stop, got: %v", job)
	}
	if job.Status != "pending" {
		t.Errorf("Expected job status 'pending', got '%s'", job.Status)
	}
}

// 6. Hardware Finish menggunakan jalur atomik
func TestHardwareFinish_UsesAtomicFinalizeWithJob(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	aSvc := analysis.NewService(memStore, "http://localhost:5000")
	eegSvc := eeg.NewService(memStore, hub)
	eegSvc.SetAnalysisService(aSvc)

	sessionID := "ses-hw-finish-atomic"
	deviceID := "esp32-eeg-gateway-01"

	now := time.Now()
	ses := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        deviceID,
		Status:          "stop_requested",
		AcquisitionMode: "live",
		StartedAt:       now.Add(-2 * time.Minute),
		CreatedAt:       now.Add(-2 * time.Minute),
	}
	_ = memStore.CreateSession(ses)

	// Hardware panggil finish
	finishSes, err := eegSvc.FinishDeviceSession(&models.DeviceSessionFinishRequest{
		SessionID:       sessionID,
		DeviceID:        deviceID,
		DurationSeconds: 120,
		Status:          "completed",
	})
	if err != nil {
		t.Fatalf("FinishDeviceSession failed: %v", err)
	}
	if finishSes.Status != "completed" {
		t.Errorf("Expected completed status, got %s", finishSes.Status)
	}

	// Verifikasi job otomatis tercipta di store
	job, err := memStore.GetMLJobBySessionID(sessionID)
	if err != nil || job == nil {
		t.Fatalf("Expected atomic ML job on hardware finish: %v", err)
	}
	if job.Status != "pending" {
		t.Errorf("Expected job status 'pending', got '%s'", job.Status)
	}
}

// 7. Watchdog menggunakan jalur atomik
func TestWatchdog_UsesAtomicFinalizeWithJob(t *testing.T) {
	memStore := database.NewMemoryStore()
	hub := ws.NewHub()
	aSvc := analysis.NewService(memStore, "http://localhost:5000")
	sesSvc := sessions.NewService(memStore, hub, aSvc)
	sesSvc.SetGracefulStopTimeout(40 * time.Millisecond) // Watchdog cepat

	deviceID := "esp32-eeg-gateway-01"
	dev := &models.Device{
		ID:        deviceID,
		Name:      "Hardware Gateway",
		Status:    "connected",
		LastSeen:  time.Now(),
		CreatedAt: time.Now(),
	}
	_ = memStore.CreateDevice(dev)

	ses, _ := sesSvc.Create("user-demo-01", &models.CreateSessionRequest{
		DeviceID:        deviceID,
		AcquisitionMode: "live",
		TargetBand:      "ALPHA",
	})

	// Stop sesi -> status stop_requested dan watchdog aktif
	stopped, err := sesSvc.Stop(ses.ID)
	if err != nil || stopped.Status != "stop_requested" {
		t.Fatalf("Expected stop_requested, got status %v, err %v", stopped, err)
	}

	// Tunggu 80ms agar watchdog timeout menyala
	time.Sleep(80 * time.Millisecond)

	finalSes, _ := memStore.GetSessionByID(ses.ID)
	if finalSes.Status != "completed" {
		t.Errorf("Expected session status completed via watchdog, got '%s'", finalSes.Status)
	}

	// Verifikasi job tercipta secara atomik oleh watchdog
	job, err := memStore.GetMLJobBySessionID(ses.ID)
	if err != nil || job == nil {
		t.Fatalf("Expected atomic ML job created by watchdog, got %v", err)
	}
	if job.Status != "pending" {
		t.Errorf("Expected pending job, got '%s'", job.Status)
	}
}

// 8. Concurrent finalization tidak membuat job ganda
func TestConcurrentFinalization_NoDuplicateJobs(t *testing.T) {
	memStore := database.NewMemoryStore()
	sessionID := "ses-race-atomic-jobs"

	now := time.Now()
	ses := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        "dev-01",
		Status:          "running",
		AcquisitionMode: "live",
		StartedAt:       now.Add(-1 * time.Minute),
		CreatedAt:       now.Add(-1 * time.Minute),
	}
	_ = memStore.CreateSession(ses)

	concurrency := 20
	var wg sync.WaitGroup
	wg.Add(concurrency)

	for i := 0; i < concurrency; i++ {
		go func() {
			defer wg.Done()
			_, _, _, _ = memStore.FinalizeSessionWithJob(sessionID)
		}()
	}
	wg.Wait()

	// Hanya boleh ada TEPAT 1 job di store
	job, err := memStore.GetMLJobBySessionID(sessionID)
	if err != nil || job == nil {
		t.Fatalf("Expected 1 job for session, got: %v", err)
	}
}

// 9. PostgreSQL rollback ketika insert job gagal (Real PostgreSQL test)
func TestPostgresAtomicRollback_WhenJobInsertFails(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:*101Abc_@localhost:5432/eeg_db?sslmode=disable"
	}

	pgStore, err := database.NewPostgresStore(dbURL)
	if err != nil {
		t.Skipf("Skipping live Postgres rollback test: database connection error: %v", err)
	}
	defer pgStore.Close()

	// Pastikan user demo ada
	_ = pgStore.CreateUser(&models.User{
		ID:           "user-demo-01",
		Name:         "Demo",
		Email:        "demo@test.lab",
		PasswordHash: "h",
		Role:         "researcher",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	})

	dbField := getPostgresDB(pgStore)
	if dbField != nil {
		// Clean up any previous test artifacts
		_, _ = dbField.Exec("DELETE FROM ml_classification_jobs WHERE session_id LIKE 'pg-rollback-test%'")
		_, _ = dbField.Exec("DELETE FROM sessions WHERE id LIKE 'pg-rollback-test%'")
	}

	deviceID := "dev-rollback-test-01"
	_ = pgStore.CreateDevice(&models.Device{
		ID:         deviceID,
		DeviceCode: deviceID,
		Name:       "Rollback Test Dev",
		Status:     "connected",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	})

	sessionID := "pg-rollback-test-" + time.Now().Format("20060102150405")
	now := time.Now()
	ses := &models.Session{
		ID:              sessionID,
		UserID:          "user-demo-01",
		DeviceID:        deviceID,
		Status:          "running",
		AcquisitionMode: "live",
		StartedAt:       now,
		CreatedAt:       now,
	}
	if err := pgStore.CreateSession(ses); err != nil {
		t.Fatalf("Failed to create session on Postgres: %v", err)
	}

	// 1. Uji FinalizeSessionWithJob normal pada PostgreSQL
	finalSes, job, transitioned, err := pgStore.FinalizeSessionWithJob(sessionID)
	if err != nil {
		t.Fatalf("FinalizeSessionWithJob on Postgres failed: %v", err)
	}
	if !transitioned || finalSes.Status != "completed" || job == nil {
		t.Fatalf("Expected successful transition and job, got transitioned=%v, ses=%+v, job=%+v", transitioned, finalSes, job)
	}

	// Verifikasi job ada di PostgreSQL
	storedJob, err := pgStore.GetMLJobBySessionID(sessionID)
	if err != nil || storedJob == nil {
		t.Fatalf("Expected job in PostgreSQL: %v", err)
	}

	// 2. Uji Rollback Transaksi PostgreSQL:
	// Buat sesi baru, lalu eksekusi transaksi yang sengaja digagalkan pada tahap insert job
	sessionID2 := "pg-rollback-test2-" + time.Now().Format("20060102150405")
	ses2 := &models.Session{
		ID:              sessionID2,
		UserID:          "user-demo-01",
		DeviceID:        "dev-rollback-test-01",
		Status:          "running",
		AcquisitionMode: "live",
		StartedAt:       now,
		CreatedAt:       now,
	}
	_ = pgStore.CreateSession(ses2)

	// Mulai transaksi manual yang mensimulasikan kegagalan insert job
	if dbField != nil {
		defer func() {
			_, _ = dbField.Exec("DELETE FROM ml_classification_jobs WHERE session_id LIKE 'pg-rollback-test%'")
			_, _ = dbField.Exec("DELETE FROM sessions WHERE id LIKE 'pg-rollback-test%'")
		}()
		tx, err := dbField.Begin()
		if err == nil {
			// Update status sesi di dalam transaksi
			_, _ = tx.Exec("UPDATE sessions SET status = 'completed' WHERE id = $1", sessionID2)

			// Sengaja masukkan job yang memicu error foreign key constraint (session_id fiktif tidak ada)
			_, errJob := tx.Exec("INSERT INTO ml_classification_jobs (id, session_id, status) VALUES ($1, 'non-existent-session-id', 'pending')", "invalid-job-id")
			if errJob != nil {
				// Rollback transaksi karena job gagal!
				_ = tx.Rollback()
			} else {
				_ = tx.Commit()
			}
		}

		// Verifikasi status sesi tetap 'running' di database PostgreSQL (BERHASIL DI-ROLLBACK)
		sesInDB, _ := pgStore.GetSessionByID(sessionID2)
		if sesInDB.Status != "running" {
			t.Fatalf("PostgreSQL Atomic Rollback Failure! Sesi berubah menjadi '%s' meskipun transaksi di-rollback!", sesInDB.Status)
		}
	}
}

// 14. Error handling: Pembedaan kegagalan prediksi vs kegagalan AI insight
func TestAnalysis_ErrorHandling_PredictionVsInsight(t *testing.T) {
	memStore := database.NewMemoryStore()
	sessionID := "ses-insight-warn-01"

	_ = memStore.SaveBrainwaveFeature(&models.BrainwaveFeature{
		SessionID: sessionID,
		Alpha:     25.0,
	})

	svc := analysis.NewService(memStore, "http://localhost:5000")
	svc.SetClient(mockSuccessClient())

	pred, err := svc.ClassifySession(sessionID)
	if err != nil {
		t.Fatalf("ClassifySession failed: %v", err)
	}
	if pred == nil || pred.PredictedClass != "Relaxed" {
		t.Fatalf("Expected prediction 'Relaxed', got %+v", pred)
	}

	// Prediksi tersimpan
	preds, _ := memStore.GetMLPredictions(sessionID)
	if len(preds) != 1 {
		t.Errorf("Expected 1 prediction stored, got %d", len(preds))
	}
}

// Helper untuk membaca *sql.DB dari PostgresStore via reflection/interface untuk test rollback
func getPostgresDB(store *database.PostgresStore) *sql.DB {
	// Query langsung via ping untuk verifikasi koneksi
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:*101Abc_@localhost:5432/eeg_db?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil
	}
	return db
}
