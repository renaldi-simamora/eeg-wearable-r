package analysis_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"sync"
	"testing"
	"time"

	"eeg-backend/internal/analysis"
	"eeg-backend/internal/database"
	"eeg-backend/models"
)

// roundTripFunc mock for http.Client
type roundTripFunc func(req *http.Request) *http.Response

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req), nil
}

func mockSuccessClient() *http.Client {
	return &http.Client{
		Transport: roundTripFunc(func(req *http.Request) *http.Response {
			resp := analysis.MLPredictResponse{
				SessionID:          "ses-123",
				ModelName:          "svm",
				ModelVersion:       "1.0.0",
				PredictedClass:     "Relaxed",
				Confidence:         0.94,
				ClassProbabilities: map[string]float64{"Relaxed": 0.94, "Focused": 0.06},
				Features:           map[string]float64{"alpha": 0.6},
				ProcessedAt:        time.Now().Format(time.RFC3339),
			}
			b, _ := json.Marshal(resp)
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewBuffer(b)),
				Header:     make(http.Header),
			}
		}),
	}
}

func mockFailingClient() *http.Client {
	return &http.Client{
		Transport: roundTripFunc(func(req *http.Request) *http.Response {
			return &http.Response{
				StatusCode: http.StatusInternalServerError,
				Body:       io.NopCloser(bytes.NewBufferString(`{"error": "ML inference engine failed"}`)),
				Header:     make(http.Header),
			}
		}),
	}
}

// 7. Finalisasi sesi membuat satu durable ML job
func TestMLJob_FinalizeCreatesJob(t *testing.T) {
	memStore := database.NewMemoryStore()
	svc := analysis.NewService(memStore, "http://localhost:5000")

	sessionID := "ses-job-create-01"
	job, err := svc.EnqueueClassificationJob(sessionID)
	if err != nil {
		t.Fatalf("Failed to enqueue job: %v", err)
	}

	if job == nil || job.SessionID != sessionID {
		t.Fatalf("Expected job for session %s, got %+v", sessionID, job)
	}
	if job.Status != "pending" {
		t.Errorf("Expected status 'pending', got '%s'", job.Status)
	}

	stored, err := memStore.GetMLJobBySessionID(sessionID)
	if err != nil || stored == nil {
		t.Fatalf("Job not found in database: %v", err)
	}
	if stored.ID != job.ID {
		t.Errorf("Stored job ID mismatch: %s vs %s", stored.ID, job.ID)
	}
}

// 8. Finalisasi berulang tidak membuat job duplikat (idempoten per session)
func TestMLJob_NoDuplicateOnRepeatedFinalize(t *testing.T) {
	memStore := database.NewMemoryStore()
	svc := analysis.NewService(memStore, "http://localhost:5000")

	sessionID := "ses-job-idempotent-01"
	job1, err1 := svc.EnqueueClassificationJob(sessionID)
	if err1 != nil {
		t.Fatalf("Call 1 failed: %v", err1)
	}

	job2, err2 := svc.EnqueueClassificationJob(sessionID)
	if err2 != nil {
		t.Fatalf("Call 2 failed: %v", err2)
	}

	if job1.ID != job2.ID {
		t.Errorf("Expected same job ID on duplicate enqueue, got %s and %s", job1.ID, job2.ID)
	}
}

// 9. Server restart mengambil kembali pending job
func TestMLJob_ServerRestart_PicksUpPendingJob(t *testing.T) {
	memStore := database.NewMemoryStore()
	sessionID := "ses-restart-01"

	// Seed spectral features
	_ = memStore.SaveBrainwaveFeature(&models.BrainwaveFeature{
		SessionID: sessionID,
		Alpha:     25.0,
		Beta:      12.0,
	})

	// Simulasikan job pending yang tertinggal sebelum server mati
	job := &models.MLClassificationJob{
		ID:          "job-orphaned-before-crash",
		SessionID:   sessionID,
		Status:      "pending",
		Attempts:    0,
		MaxAttempts: 3,
		NextRunAt:   time.Now().Add(-10 * time.Second),
		CreatedAt:   time.Now().Add(-10 * time.Second),
	}
	_ = memStore.CreateMLJob(job)

	// Inisialisasi service baru (simulasi reboot server)
	newSvc := analysis.NewService(memStore, "http://localhost:5000")
	newSvc.SetClient(mockSuccessClient())

	// Proses pending jobs
	processed, err := newSvc.ProcessPendingJobs()
	if err != nil {
		t.Fatalf("Failed to process pending jobs: %v", err)
	}
	if processed != 1 {
		t.Fatalf("Expected 1 job to be processed on startup, got %d", processed)
	}

	updatedJob, _ := memStore.GetMLJobBySessionID(sessionID)
	if updatedJob.Status != "completed" {
		t.Errorf("Expected job status 'completed', got '%s'", updatedJob.Status)
	}
	if updatedJob.CompletedAt == nil {
		t.Errorf("Expected completed_at timestamp to be set")
	}
}

// 10. Python service gagal dan job dapat di-retry dengan backoff
func TestMLJob_ServiceFails_RetriedWithBackoff(t *testing.T) {
	memStore := database.NewMemoryStore()
	sessionID := "ses-retry-01"

	_ = memStore.SaveBrainwaveFeature(&models.BrainwaveFeature{
		SessionID: sessionID,
		Alpha:     20.0,
	})

	svc := analysis.NewService(memStore, "http://localhost:5000")
	svc.SetClient(mockFailingClient()) // Service error 500

	job, _ := svc.EnqueueClassificationJob(sessionID)

	// Percobaan ke-1
	beforeRun := time.Now()
	processed, _ := svc.ProcessPendingJobs()
	if processed != 1 {
		t.Fatalf("Expected 1 job processed, got %d", processed)
	}

	retriedJob, _ := memStore.GetMLJobBySessionID(sessionID)
	if retriedJob.Status != "pending" {
		t.Errorf("Expected status 'pending' for retry, got '%s'", retriedJob.Status)
	}
	if retriedJob.Attempts != 1 {
		t.Errorf("Expected attempts=1, got %d", retriedJob.Attempts)
	}
	if retriedJob.NextRunAt.Before(beforeRun) {
		t.Errorf("Expected next_run_at to be scheduled in the future, got %v", retriedJob.NextRunAt)
	}
	if retriedJob.LastError == "" {
		t.Errorf("Expected last_error to be recorded")
	}
	_ = job
}

// 11. Dua worker tidak memproses job yang sama secara bersamaan (Concurrency safety)
func TestMLJob_Concurrency_TwoWorkersNoCollision(t *testing.T) {
	memStore := database.NewMemoryStore()

	// Buat 10 pending jobs
	for i := 0; i < 10; i++ {
		sessID := "ses-race-" + string(rune('A'+i))
		_ = memStore.CreateMLJob(&models.MLClassificationJob{
			ID:          "job-race-" + string(rune('A'+i)),
			SessionID:   sessID,
			Status:      "pending",
			Attempts:    0,
			MaxAttempts: 3,
			NextRunAt:   time.Now().Add(-1 * time.Second),
		})
	}

	// Dua worker mengklaim secara bersamaan
	var wg sync.WaitGroup
	var claimed1, claimed2 []models.MLClassificationJob

	wg.Add(2)
	go func() {
		defer wg.Done()
		claimed1, _ = memStore.ClaimNextPendingMLJobs(5)
	}()
	go func() {
		defer wg.Done()
		claimed2, _ = memStore.ClaimNextPendingMLJobs(5)
	}()
	wg.Wait()

	// Verifikasi tidak ada job ID yang diklaim oleh kedua worker (disjoint sets)
	seen := make(map[string]bool)
	for _, j := range claimed1 {
		seen[j.ID] = true
	}
	for _, j := range claimed2 {
		if seen[j.ID] {
			t.Errorf("Job collision detected! Job %s claimed by both workers concurrently", j.ID)
		}
		seen[j.ID] = true
	}

	if len(seen) != 10 {
		t.Errorf("Expected total 10 unique jobs claimed, got %d", len(seen))
	}
}

// 12. Job completed tidak diproses ulang
func TestMLJob_CompletedJobNotReprocessed(t *testing.T) {
	memStore := database.NewMemoryStore()
	sessionID := "ses-completed-ignore"

	now := time.Now()
	job := &models.MLClassificationJob{
		ID:          "job-already-completed",
		SessionID:   sessionID,
		Status:      "completed",
		Attempts:    1,
		MaxAttempts: 3,
		CompletedAt: &now,
		NextRunAt:   now.Add(-1 * time.Hour),
	}
	_ = memStore.CreateMLJob(job)

	claimed, err := memStore.ClaimNextPendingMLJobs(10)
	if err != nil {
		t.Fatalf("Claim error: %v", err)
	}
	if len(claimed) != 0 {
		t.Errorf("Expected 0 jobs claimed, but completed job was claimed: %+v", claimed)
	}
}

// 13. Job failed setelah batas retry (max_attempts) ditangani dengan benar
func TestMLJob_FailsAfterMaxAttempts(t *testing.T) {
	memStore := database.NewMemoryStore()
	sessionID := "ses-exhausted-01"

	_ = memStore.SaveBrainwaveFeature(&models.BrainwaveFeature{
		SessionID: sessionID,
		Alpha:     10.0,
	})

	// Job sudah mencoba 2 kali dari batas 3
	now := time.Now()
	job := &models.MLClassificationJob{
		ID:          "job-exhaustion",
		SessionID:   sessionID,
		Status:      "pending",
		Attempts:    2,
		MaxAttempts: 3,
		NextRunAt:   now.Add(-1 * time.Second),
	}
	_ = memStore.CreateMLJob(job)

	svc := analysis.NewService(memStore, "http://localhost:5000")
	svc.SetClient(mockFailingClient()) // Service gagal lagi

	processed, err := svc.ProcessPendingJobs()
	if err != nil {
		t.Fatalf("Process error: %v", err)
	}
	if processed != 1 {
		t.Fatalf("Expected 1 job processed, got %d", processed)
	}

	finalJob, _ := memStore.GetMLJobBySessionID(sessionID)
	if finalJob.Status != "failed" {
		t.Errorf("Expected status 'failed' after exhausting 3 attempts, got '%s'", finalJob.Status)
	}
	if finalJob.Attempts != 3 {
		t.Errorf("Expected attempts=3, got %d", finalJob.Attempts)
	}

	// Verifikasi job yang failed tidak lagi diklaim untuk diproses ulang
	reclaimed, _ := memStore.ClaimNextPendingMLJobs(10)
	if len(reclaimed) != 0 {
		t.Errorf("Failed job must not be reclaimed, but got %d jobs", len(reclaimed))
	}
}

// 14. Kegagalan klasifikasi TIDAK MENGUBAH status sesi completed
func TestMLJob_FailureDoesNotRevertCompletedSession(t *testing.T) {
	memStore := database.NewMemoryStore()
	sessionID := "ses-completed-safe"

	// Sesi berstatus completed di database
	now := time.Now()
	ses := &models.Session{
		ID:        sessionID,
		UserID:    "user-demo-01",
		DeviceID:  "dev-01",
		Status:    "completed",
		StartedAt: now.Add(-10 * time.Minute),
		EndedAt:   &now,
		Duration:  600,
	}
	_ = memStore.CreateSession(ses)

	// Fitur ada
	_ = memStore.SaveBrainwaveFeature(&models.BrainwaveFeature{
		SessionID: sessionID,
		Alpha:     30.0,
	})

	svc := analysis.NewService(memStore, "http://localhost:5000")
	svc.SetClient(mockFailingClient()) // Selalu gagal

	_, _ = svc.EnqueueClassificationJob(sessionID)
	_, _ = svc.ProcessPendingJobs()

	// Verifikasi status sesi di database
	sesInDB, err := memStore.GetSessionByID(sessionID)
	if err != nil || sesInDB == nil {
		t.Fatalf("Session not found: %v", err)
	}
	if sesInDB.Status != "completed" {
		t.Errorf("Academic Safety Violation! Sesi completed berubah menjadi '%s' akibat kegagalan ML!", sesInDB.Status)
	}
}
