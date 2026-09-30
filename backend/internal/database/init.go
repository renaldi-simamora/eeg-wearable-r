package database

import (
	"log"
	"os"
)

func InitDatabase(dbURL string) Store {
	log.Printf("[DATABASE] Connecting to PostgreSQL at %s...", dbURL)

	pgStore, err := NewPostgresStore(dbURL)
	if err == nil {
		log.Println("[DATABASE] Successfully connected to PostgreSQL database.")

		// Read migration SQL file if present
		migrationBytes, err := os.ReadFile("migrations/000001_init_schema.sql")
		if err != nil {
			// Fallback path if run from cmd/server
			migrationBytes, err = os.ReadFile("../../migrations/000001_init_schema.sql")
		}

		if err == nil {
			if migErr := pgStore.RunMigrations(string(migrationBytes)); migErr != nil {
				log.Printf("[DATABASE] Migration warning: %v", migErr)
			} else {
				log.Println("[DATABASE] Schema migrations applied successfully.")
			}
		}

		pgStore.SeedInitialData()
		return pgStore
	}

	log.Printf("[DATABASE] PostgreSQL is not reachable (%v).", err)
	log.Println("[DATABASE] Initializing in-memory fallback data store with seeded research devices.")
	log.Println("[DATABASE] Note: Start PostgreSQL and provide DATABASE_URL to persist data into PostgreSQL.")

	return NewMemoryStore()
}
