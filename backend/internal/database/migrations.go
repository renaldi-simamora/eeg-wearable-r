package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// FindMigrationsDir locates the migrations directory relative to the current working directory
func FindMigrationsDir() (string, error) {
	candidates := []string{
		"migrations",
		"backend/migrations",
		"../migrations",
		"../../migrations",
	}

	for _, c := range candidates {
		info, err := os.Stat(c)
		if err == nil && info.IsDir() {
			testFile := filepath.Join(c, "000001_init_schema.sql")
			if _, err := os.Stat(testFile); err == nil {
				return c, nil
			}
		}
	}
	return "", fmt.Errorf("migrations directory not found in candidates: %v", candidates)
}

// RunAllMigrations executes all pending migrations in migrationsDir in alphabetical order within transactions
func (s *PostgresStore) RunAllMigrations(migrationsDir string) error {
	// 1. Ensure schema_migrations table exists
	initMigrationsTable := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(100) PRIMARY KEY,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);
	`
	if _, err := s.db.Exec(initMigrationsTable); err != nil {
		return fmt.Errorf("failed to initialize schema_migrations table: %w", err)
	}

	// 2. Query already applied migrations
	rows, err := s.db.Query("SELECT version FROM schema_migrations")
	if err != nil {
		return fmt.Errorf("failed to query applied schema_migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return err
		}
		applied[v] = true
	}
	if err := rows.Err(); err != nil {
		return err
	}

	// 3. Read and sort migration files
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations directory %s: %w", migrationsDir, err)
	}

	var files []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			files = append(files, entry.Name())
		}
	}
	sort.Strings(files)

	if len(files) == 0 {
		return fmt.Errorf("no migration sql files found in %s", migrationsDir)
	}

	// 4. Apply each pending migration in order within an atomic transaction
	for _, file := range files {
		if applied[file] {
			continue // Already applied; skip
		}

		fullPath := filepath.Join(migrationsDir, file)
		content, err := os.ReadFile(fullPath)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", file, err)
		}

		tx, err := s.db.Begin()
		if err != nil {
			return fmt.Errorf("failed to begin transaction for migration %s: %w", file, err)
		}

		if _, err := tx.Exec(string(content)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("migration %s execution failed: %w", file, err)
		}

		if _, err := tx.Exec("INSERT INTO schema_migrations (version) VALUES ($1)", file); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("failed to record migration %s in schema_migrations: %w", file, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", file, err)
		}

		log.Printf("[DATABASE MIGRATION] Successfully applied migration: %s", file)
	}

	return nil
}

// GetAppliedMigrations returns list of all migration versions recorded in schema_migrations
func (s *PostgresStore) GetAppliedMigrations() ([]string, error) {
	rows, err := s.db.Query("SELECT version FROM schema_migrations ORDER BY version ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var versions []string
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		versions = append(versions, v)
	}
	return versions, rows.Err()
}

