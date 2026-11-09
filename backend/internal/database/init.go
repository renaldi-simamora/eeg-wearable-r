package database

import (
	"log"
)

func InitDatabase(dbURL string) Store {
	log.Printf("[DATABASE] Connecting to PostgreSQL at %s...", dbURL)

	pgStore, err := NewPostgresStore(dbURL)
	if err == nil {
		log.Println("[DATABASE] Successfully connected to PostgreSQL database.")

		migrationsDir, err := FindMigrationsDir()
		if err != nil {
			log.Fatalf("[DATABASE FATAL] Could not find migrations directory: %v", err)
		}

		if migErr := pgStore.RunAllMigrations(migrationsDir); migErr != nil {
			log.Fatalf("[DATABASE FATAL] Database migration failed: %v", migErr)
		}
		log.Println("[DATABASE] All schema migrations verified and applied successfully.")

		pgStore.SeedInitialData()
		return pgStore
	}

	log.Printf("[DATABASE] PostgreSQL is not reachable (%v).", err)
	log.Println("[DATABASE] Initializing in-memory fallback data store with seeded research devices.")
	log.Println("[DATABASE] Note: Start PostgreSQL and provide DATABASE_URL to persist data into PostgreSQL.")

	return NewMemoryStore()
}
