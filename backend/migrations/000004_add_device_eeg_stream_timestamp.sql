-- Migration: Add last_eeg_stream_at to devices to prove active TGAM1 EEG biopotential streaming
-- Academic Engineering Project: NeuroPulse EEG Wearable Platform

ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_eeg_stream_at TIMESTAMP WITH TIME ZONE;

