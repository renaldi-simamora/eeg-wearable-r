-- Migration 000005: Nullable SignalQuality and Dedicated Timestamp
-- Project: NeuroPulse EEG Wearable Platform
-- Academic Engineering Research: Clean separation between unreceived/null signal quality and valid 0 (Good Contact)

-- 1. Devices table adjustments
ALTER TABLE devices ALTER COLUMN signal_quality DROP NOT NULL;
ALTER TABLE devices ALTER COLUMN signal_quality DROP DEFAULT;
ALTER TABLE devices ALTER COLUMN signal_quality SET DEFAULT NULL;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS signal_quality_updated_at TIMESTAMP WITH TIME ZONE NULL;

-- 2. Sessions table adjustments: Ensure acquisition_mode defaults to 'simulated'
ALTER TABLE sessions ALTER COLUMN acquisition_mode SET DEFAULT 'simulated';

-- 3. Reset hardware gateway signal quality to NULL (uninitialized) until verified TGAM1 frame arrives
UPDATE devices SET signal_quality = NULL, signal_quality_updated_at = NULL WHERE id = 'esp32-eeg-gateway-01';
UPDATE devices SET signal_quality = NULL, signal_quality_updated_at = NULL WHERE id LIKE 'dev-%';
