package config

import (
	"errors"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Known development default secrets.
// These are strictly prohibited from being used in production environments.
const (
	DevDefaultJWTSecret    = "eeg-platform-secure-jwt-academic-secret-key-32chars"
	DevDefaultDeviceAPIKey = "eeg-device-secret-key-academic-2026"

	// Default timeouts for IoT graceful stop handshake and startup recovery
	DefaultGracefulStopTimeout = 60 * time.Second
	DefaultRecoveryAgeCutoff   = 2 * time.Minute
)

type Config struct {
	Port                string
	DatabaseURL         string
	JWTSecret           string
	CORSOrigin          string
	GoogleClientID      string
	MLServiceURL        string
	DeviceAPIKey        string
	GracefulStopTimeout time.Duration
	RecoveryAgeCutoff   time.Duration
}

// IsProductionMode determines whether the application is running in production.
// It checks APP_ENV, ENV, and GIN_MODE consistently.
func IsProductionMode() bool {
	appEnv := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENV")))
	ginMode := strings.ToLower(strings.TrimSpace(os.Getenv("GIN_MODE")))

	return appEnv == "production" || appEnv == "prod" ||
		env == "production" || env == "prod" ||
		ginMode == "release"
}

// IsProduction returns true if config is operating in production mode.
func (c *Config) IsProduction() bool {
	return IsProductionMode()
}

// Validate checks whether secrets and configuration meet environment safety standards.
// In production, empty or default secrets are strictly rejected before port binding.
func (c *Config) Validate() error {
	isProd := c.IsProduction()

	if isProd {
		// 1. Strict JWT_SECRET verification
		if c.JWTSecret == "" {
			return errors.New("in production mode, JWT_SECRET must be explicitly set and cannot be empty")
		}
		if c.JWTSecret == DevDefaultJWTSecret {
			return errors.New("in production mode, JWT_SECRET cannot use the development default secret")
		}
		if len(c.JWTSecret) < 32 {
			return errors.New("in production mode, JWT_SECRET must be at least 32 characters long")
		}

		// 2. Strict DEVICE_API_KEY verification
		if c.DeviceAPIKey == "" {
			return errors.New("in production mode, DEVICE_API_KEY must be explicitly set and cannot be empty")
		}
		if c.DeviceAPIKey == DevDefaultDeviceAPIKey {
			return errors.New("in production mode, DEVICE_API_KEY cannot use the development default secret")
		}
	} else {
		// Development mode: log informative warnings without revealing secret values
		if c.JWTSecret == DevDefaultJWTSecret {
			log.Println("[CONFIG WARNING] Running in development mode with default JWT_SECRET. Provide an explicit JWT_SECRET for production.")
		}
		if c.DeviceAPIKey == DevDefaultDeviceAPIKey {
			log.Println("[CONFIG WARNING] Running in development mode with default DEVICE_API_KEY. Provide an explicit DEVICE_API_KEY for production.")
		}
	}

	return nil
}

func LoadConfig() *Config {
	// Attempt to load .env file if it exists
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/eeg_db?sslmode=disable"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = DevDefaultJWTSecret
	}

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" && !IsProductionMode() {
		corsOrigin = "http://localhost:3000"
	}

	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")

	mlServiceURL := os.Getenv("ML_SERVICE_URL")
	if mlServiceURL == "" {
		mlServiceURL = "http://localhost:5000"
	}

	deviceAPIKey := os.Getenv("DEVICE_API_KEY")
	if deviceAPIKey == "" {
		deviceAPIKey = DevDefaultDeviceAPIKey
	}

	gracefulStopTimeout := DefaultGracefulStopTimeout
	if timeoutStr := os.Getenv("GRACEFUL_STOP_TIMEOUT_SECONDS"); timeoutStr != "" {
		if sec, err := strconv.Atoi(timeoutStr); err == nil && sec > 0 {
			gracefulStopTimeout = time.Duration(sec) * time.Second
		}
	}

	recoveryAgeCutoff := DefaultRecoveryAgeCutoff
	if cutoffStr := os.Getenv("RECOVERY_AGE_CUTOFF_SECONDS"); cutoffStr != "" {
		if sec, err := strconv.Atoi(cutoffStr); err == nil && sec > 0 {
			recoveryAgeCutoff = time.Duration(sec) * time.Second
		}
	}

	cfg := &Config{
		Port:                port,
		DatabaseURL:         dbURL,
		JWTSecret:           jwtSecret,
		CORSOrigin:          corsOrigin,
		GoogleClientID:      googleClientID,
		MLServiceURL:        mlServiceURL,
		DeviceAPIKey:        deviceAPIKey,
		GracefulStopTimeout: gracefulStopTimeout,
		RecoveryAgeCutoff:   recoveryAgeCutoff,
	}

	return cfg
}
