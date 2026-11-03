-- Migration: Add session metadata columns for comprehensive report and session management
-- Academic Research Project: NeuroPulse EEG Wearable Platform

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS participant_name VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS acquisition_mode VARCHAR(50) NOT NULL DEFAULT 'live';

-- Create index on participant_name and title for efficient search/filtering
CREATE INDEX IF NOT EXISTS idx_sessions_participant_name ON sessions(participant_name);
CREATE INDEX IF NOT EXISTS idx_sessions_acquisition_mode ON sessions(acquisition_mode);

