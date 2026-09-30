-- Schema Migration for EEG Wearable Platform
-- Academic Engineering Project:
-- "Rancang Bangun Perangkat IoT Wearable Berbasis EEG untuk Klasifikasi Pola Gelombang Otak Menggunakan Machine Learning"

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'researcher',
    institution VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(36) PRIMARY KEY,
    device_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'disconnected', -- connected, disconnected, warning
    battery_level INT NOT NULL DEFAULT 100,
    signal_quality INT NOT NULL DEFAULT 0,
    firmware_version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(36) NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INT NOT NULL DEFAULT 0, -- in seconds
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eeg_samples (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    raw_eeg DOUBLE PRECISION NOT NULL,
    signal_quality INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brainwave_features (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    delta DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    theta DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    alpha DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    beta DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    gamma DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Future-ready ML Predictions table
CREATE TABLE IF NOT EXISTS ml_predictions (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    predicted_class VARCHAR(100) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Future-ready AI Insights table
CREATE TABLE IF NOT EXISTS ai_insights (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_eeg_samples_session_id ON eeg_samples(session_id);
CREATE INDEX IF NOT EXISTS idx_eeg_samples_timestamp ON eeg_samples(timestamp);
CREATE INDEX IF NOT EXISTS idx_brainwave_features_session_id ON brainwave_features(session_id);
CREATE INDEX IF NOT EXISTS idx_brainwave_features_timestamp ON brainwave_features(timestamp);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_session_id ON ml_predictions(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_session_id ON ai_insights(session_id);
