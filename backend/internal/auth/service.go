package auth

import (
	"errors"
	"time"

	"eeg-backend/internal/database"
	"eeg-backend/internal/middleware"
	"eeg-backend/models"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	store     database.Store
	jwtSecret string
}

func NewService(store database.Store, jwtSecret string) *Service {
	return &Service{
		store:     store,
		jwtSecret: jwtSecret,
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
