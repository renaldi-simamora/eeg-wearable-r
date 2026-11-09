package database_test

import (
	"os"
	"path/filepath"
	"testing"

	"eeg-backend/internal/database"
)

// 10, 11, 12. Migration runner: berurutan, tercatat, tidak diulang, dan gagal cepat pada error
func TestMigrations_RunnerAndTracking(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:*101Abc_@localhost:5432/eeg_db?sslmode=disable"
	}

	pgStore, err := database.NewPostgresStore(dbURL)
	if err != nil {
		t.Skipf("Skipping live Postgres migration test: database connection error: %v", err)
	}
	defer pgStore.Close()

	// Buat direktori migrasi temporer
	tmpDir, err := os.MkdirTemp("", "eeg_mig_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// File 1: DDL valid
	f1 := filepath.Join(tmpDir, "000001_create_test_table.sql")
	_ = os.WriteFile(f1, []byte(`
		CREATE TABLE IF NOT EXISTS test_migration_runner (
			id VARCHAR(36) PRIMARY KEY,
			val TEXT NOT NULL
		);
	`), 0644)

	// File 2: DDL valid berurutan
	f2 := filepath.Join(tmpDir, "000002_add_column_test.sql")
	_ = os.WriteFile(f2, []byte(`
		ALTER TABLE test_migration_runner ADD COLUMN IF NOT EXISTS extra_col INT DEFAULT 0;
	`), 0644)

	// Bersihkan tabel pencatatan sementara jika ada versi uji coba sebelumnya
	_ = pgStore.RunMigrations("DELETE FROM schema_migrations WHERE version IN ('000001_create_test_table.sql', '000002_add_column_test.sql', '000003_failing_migration.sql');")
	_ = pgStore.RunMigrations("DROP TABLE IF EXISTS test_migration_runner;")

	// 10. Jalankan migrasi berurutan
	if err := pgStore.RunAllMigrations(tmpDir); err != nil {
		t.Fatalf("RunAllMigrations failed on valid migrations: %v", err)
	}

	// 11. Verifikasi migrasi tercatat di schema_migrations
	applied, err := pgStore.GetAppliedMigrations()
	if err != nil {
		t.Fatalf("Failed to get applied migrations: %v", err)
	}

	found1, found2 := false, false
	for _, v := range applied {
		if v == "000001_create_test_table.sql" {
			found1 = true
		}
		if v == "000002_add_column_test.sql" {
			found2 = true
		}
	}
	if !found1 || !found2 {
		t.Errorf("Expected both test migrations to be recorded, got: %v", applied)
	}

	// 11. Jalankan ulang: migrasi yang sudah tercatat TIDAK dijalankan ulang (idempoten)
	if err := pgStore.RunAllMigrations(tmpDir); err != nil {
		t.Fatalf("Re-running applied migrations should succeed cleanly, got error: %v", err)
	}

	// 12. Tambahkan migrasi yang salah (sintaks error) -> Harus gagal dan transaksi di-rollback
	f3 := filepath.Join(tmpDir, "000003_failing_migration.sql")
	_ = os.WriteFile(f3, []byte(`INVALID SQL SYNTAX THAT CANNOT PARSE;`), 0644)

	errFailing := pgStore.RunAllMigrations(tmpDir)
	if errFailing == nil {
		t.Fatal("Expected RunAllMigrations to fail on invalid SQL syntax, but it succeeded")
	}

	// Verifikasi file gagal tidak dicatat di schema_migrations
	appliedAfterFail, _ := pgStore.GetAppliedMigrations()
	for _, v := range appliedAfterFail {
		if v == "000003_failing_migration.sql" {
			t.Errorf("Failed migration must NOT be recorded in schema_migrations table")
		}
	}

	// Cleanup
	_ = pgStore.RunMigrations("DROP TABLE IF EXISTS test_migration_runner;")
	_ = pgStore.RunMigrations("DELETE FROM schema_migrations WHERE version IN ('000001_create_test_table.sql', '000002_add_column_test.sql');")
}

