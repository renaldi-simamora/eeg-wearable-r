-- Migration 000007: Add User Management fields
-- Academic Research Project: NeuroPulse EEG Wearable Platform
-- Supports enterprise/laboratory user management: division, position, status, username, and last login

ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS division VARCHAR(100) DEFAULT 'Biomedical & AI Lab';
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR(100) DEFAULT 'Researcher';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE NULL;

-- Create index for status and division filtering
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_division ON users(division);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Populate initial values for existing users
UPDATE users SET username = SPLIT_PART(email, '@', 1) WHERE username = '' OR username IS NULL;
UPDATE users SET status = 'active' WHERE status IS NULL;
UPDATE users SET division = 'Biomedical & AI Lab' WHERE division IS NULL OR division = '';
UPDATE users SET position = 'Lead Researcher' WHERE (position IS NULL OR position = '') AND (role = 'researcher' OR role = 'admin');
UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = 'admin@gmail.com' AND last_login IS NULL;

