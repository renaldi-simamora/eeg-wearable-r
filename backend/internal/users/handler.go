package users

import (
	"net/http"

	"eeg-backend/internal/database"
	"eeg-backend/models"

	"github.com/gin-gonic/gin"
)

type Service struct {
	store database.Store
}

func NewService(store database.Store) *Service {
	return &Service{store: store}
}

func (s *Service) GetUserProfile(id string) (*models.User, error) {
	return s.store.GetUserByID(id)
}

func (s *Service) UpdateUserProfile(id string, req *models.UpdateUserRequest) (*models.User, error) {
	user, err := s.store.GetUserByID(id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, http.ErrNoLocation
	}

	user.Name = req.Name
	user.Institution = req.Institution

	if err := s.store.UpdateUser(user); err != nil {
		return nil, err
	}
	return user, nil
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetMe(c *gin.Context) {
	userID, _ := c.Get("userID")
	user, err := h.service.GetUserProfile(userID.(string))
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error:   "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    user,
	})
}

func (h *Handler) UpdateMe(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	user, err := h.service.UpdateUserProfile(userID.(string), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Profile updated successfully",
		Data:    user,
	})
}
