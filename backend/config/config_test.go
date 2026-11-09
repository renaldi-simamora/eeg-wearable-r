package config_test

import (
	"os"
	"strings"
	"testing"

	"eeg-backend/config"
)

func TestConfig_DevelopmentMode(t *testing.T) {
	// Ensure we are in development mode
	_ = os.Setenv("APP_ENV", "development")
	_ = os.Setenv("ENV", "development")
	_ = os.Setenv("GIN_MODE", "debug")
	defer func() {
		_ = os.Unsetenv("APP_ENV")
		_ = os.Unsetenv("ENV")
		_ = os.Unsetenv("GIN_MODE")
	}()

	cfg := &config.Config{
		JWTSecret:    config.DevDefaultJWTSecret,
		DeviceAPIKey: config.DevDefaultDeviceAPIKey,
	}

	if cfg.IsProduction() {
		t.Fatalf("expected development mode, got production")
	}

	if err := cfg.Validate(); err != nil {
		t.Fatalf("development mode with default secrets should pass validation, got: %v", err)
	}
}

func TestConfig_ProductionMode_Rejections(t *testing.T) {
	// 1. Test APP_ENV=production
	_ = os.Setenv("APP_ENV", "production")
	defer func() {
		_ = os.Unsetenv("APP_ENV")
	}()

	// Case A: Default dev JWT_SECRET in production -> must be rejected
	{
		cfg := &config.Config{
			JWTSecret:    config.DevDefaultJWTSecret,
			DeviceAPIKey: "custom-production-hardware-key-123456",
		}
		err := cfg.Validate()
		if err == nil {
			t.Fatalf("expected error when using default JWT_SECRET in production")
		}
		if !strings.Contains(err.Error(), "cannot use the development default") {
			t.Errorf("unexpected error message: %v", err)
		}
	}

	// Case B: Empty JWT_SECRET in production -> must be rejected
	{
		cfg := &config.Config{
			JWTSecret:    "",
			DeviceAPIKey: "custom-production-hardware-key-123456",
		}
		err := cfg.Validate()
		if err == nil {
			t.Fatalf("expected error for empty JWT_SECRET in production")
		}
	}

	// Case C: Short JWT_SECRET (< 32 chars) in production -> must be rejected
	{
		cfg := &config.Config{
			JWTSecret:    "too-short-secret-123",
			DeviceAPIKey: "custom-production-hardware-key-123456",
		}
		err := cfg.Validate()
		if err == nil {
			t.Fatalf("expected error for short JWT_SECRET in production")
		}
		if !strings.Contains(err.Error(), "at least 32 characters") {
			t.Errorf("unexpected error message: %v", err)
		}
	}

	// Case D: Default dev DEVICE_API_KEY in production -> must be rejected
	{
		cfg := &config.Config{
			JWTSecret:    "secure-production-jwt-secret-key-with-sufficient-length",
			DeviceAPIKey: config.DevDefaultDeviceAPIKey,
		}
		err := cfg.Validate()
		if err == nil {
			t.Fatalf("expected error when using default DEVICE_API_KEY in production")
		}
		if !strings.Contains(err.Error(), "cannot use the development default") {
			t.Errorf("unexpected error message: %v", err)
		}
	}

	// Case E: Empty DEVICE_API_KEY in production -> must be rejected
	{
		cfg := &config.Config{
			JWTSecret:    "secure-production-jwt-secret-key-with-sufficient-length",
			DeviceAPIKey: "",
		}
		err := cfg.Validate()
		if err == nil {
			t.Fatalf("expected error for empty DEVICE_API_KEY in production")
		}
	}

	// Case F: Valid production configuration -> passes
	{
		cfg := &config.Config{
			JWTSecret:    "secure-production-jwt-secret-key-with-sufficient-length",
			DeviceAPIKey: "custom-production-hardware-key-123456",
		}
		if err := cfg.Validate(); err != nil {
			t.Fatalf("expected valid production config to pass, got: %v", err)
		}
	}
}

func TestConfig_ProductionDetectionAliases(t *testing.T) {
	// GIN_MODE=release must trigger production mode
	_ = os.Unsetenv("APP_ENV")
	_ = os.Unsetenv("ENV")
	_ = os.Setenv("GIN_MODE", "release")
	defer func() {
		_ = os.Unsetenv("GIN_MODE")
	}()

	if !config.IsProductionMode() {
		t.Errorf("expected GIN_MODE=release to trigger production mode")
	}

	// ENV=prod must trigger production mode
	_ = os.Setenv("GIN_MODE", "debug")
	_ = os.Setenv("ENV", "prod")
	defer func() {
		_ = os.Unsetenv("ENV")
	}()

	if !config.IsProductionMode() {
		t.Errorf("expected ENV=prod to trigger production mode")
	}
}
