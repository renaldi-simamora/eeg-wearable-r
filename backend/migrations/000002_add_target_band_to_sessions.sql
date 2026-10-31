-- Migration: 000002_add_target_band_to_sessions.sql
-- Ensure immutable target_band column exists on sessions table

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS target_band VARCHAR(20) NOT NULL DEFAULT 'ALPHA';
CREATE INDEX IF NOT EXISTS idx_sessions_target_band ON sessions(target_band);

