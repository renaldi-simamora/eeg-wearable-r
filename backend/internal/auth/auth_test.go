package auth_test

import (
	"testing"

	"eeg-backend/internal/auth"
	"eeg-backend/internal/database"
	"eeg-backend/models"
)

func TestAuthRegisterAndLogin(t *testing.T) {
	memStore := database.NewMemoryStore()
	jwtSecret := "test-secret-key-1234567890123456"
	authService := auth.NewService(memStore, jwtSecret, "")

	// 1. Register
	regReq := &models.RegisterRequest{
		Name:        "Test Researcher",
		Email:       "test@research.ac.id",
		Password:    "password123",
		Institution: "EEG Lab",
	}

	res, err := authService.Register(regReq)
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	if res.Token == "" {
		t.Errorf("Expected non-empty JWT token on register")
	}
	if res.User.Email != "test@research.ac.id" {
		t.Errorf("Expected user email to match, got %s", res.User.Email)
	}

	// 2. Duplicate Register should fail
	_, err = authService.Register(regReq)
	if err == nil {
		t.Errorf("Expected duplicate email registration to fail")
	}

	// 3. Login with correct credentials
	loginReq := &models.LoginRequest{
		Email:    "test@research.ac.id",
		Password: "password123",
	}

	loginRes, err := authService.Login(loginReq)
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}
	if loginRes.Token == "" {
		t.Errorf("Expected non-empty JWT token on login")
	}

	// 4. Login with invalid password
	badLoginReq := &models.LoginRequest{
		Email:    "test@research.ac.id",
		Password: "wrongpassword",
	}
	_, err = authService.Login(badLoginReq)
	if err == nil {
		t.Errorf("Expected login with wrong password to fail")
	}
}
