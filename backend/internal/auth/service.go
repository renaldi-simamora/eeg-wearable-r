package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"eeg-backend/internal/database"
	"eeg-backend/internal/middleware"
	"eeg-backend/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	store          database.Store
	jwtSecret      string
	googleClientID string
}

func NewService(store database.Store, jwtSecret string, googleClientID string) *Service {
	return &Service{
		store:          store,
		jwtSecret:      jwtSecret,
		googleClientID: googleClientID,
	}
}

func (s *Service) Register(req *models.RegisterRequest) (*models.AuthResponse, error) {
	existing, err := s.store.GetUserByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("user with this email already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user := &models.User{
		ID:           uuid.New().String(),
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         "researcher",
		Institution:  req.Institution,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.store.CreateUser(user); err != nil {
		return nil, err
	}

	token, err := middleware.GenerateToken(user, s.jwtSecret)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (s *Service) Login(req *models.LoginRequest) (*models.AuthResponse, error) {
	user, err := s.store.GetUserByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	token, err := middleware.GenerateToken(user, s.jwtSecret)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (s *Service) GetMe(userID string) (*models.User, error) {
	user, err := s.store.GetUserByID(userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}
	return user, nil
}

func (s *Service) LoginWithGoogle(credential string) (*models.AuthResponse, error) {
	if credential == "" {
		return nil, errors.New("google credential is required")
	}

	// Verify ID token with Google's public tokeninfo endpoint
	resp, err := http.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(credential))
	if err != nil {
		return nil, fmt.Errorf("failed to verify google token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("invalid google token: %s", string(body))
	}

	var info struct {
		Aud           string `json:"aud"`
		Email         string `json:"email"`
		EmailVerified string `json:"email_verified"`
		Name          string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("failed to parse google response: %w", err)
	}

	if s.googleClientID != "" && info.Aud != s.googleClientID {
		return nil, errors.New("client ID mismatch on google token")
	}

	if info.Email == "" {
		return nil, errors.New("google account has no email")
	}

	// Check if user already exists
	user, err := s.store.GetUserByEmail(info.Email)
	if err != nil {
		return nil, err
	}

	if user == nil {
		name := info.Name
		if name == "" {
			name = "Google Researcher"
		}
		now := time.Now()
		user = &models.User{
			ID:           uuid.New().String(),
			Name:         name,
			Email:        info.Email,
			PasswordHash: "oauth2_google_" + uuid.New().String(),
			Role:         "researcher",
			Institution:  "Biomedical Research Center",
			CreatedAt:    now,
			UpdatedAt:    now,
		}
		if err := s.store.CreateUser(user); err != nil {
			return nil, fmt.Errorf("failed to create user: %w", err)
		}
	}

	token, err := middleware.GenerateToken(user, s.jwtSecret)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

