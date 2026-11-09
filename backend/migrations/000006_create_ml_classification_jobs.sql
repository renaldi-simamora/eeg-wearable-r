-- Migration: 000006_create_ml_classification_jobs.sql
-- Description: Create persistent durable queue for ML classification jobs to survive server restarts

CREATE TABLE IF NOT EXISTS ml_classification_jobs (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) UNIQUE NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    last_error TEXT NOT NULL DEFAULT '',
    next_run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ml_classification_jobs_status_next_run ON ml_classification_jobs(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_ml_classification_jobs_session_id ON ml_classification_jobs(session_id);

