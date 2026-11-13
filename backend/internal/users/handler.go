package users

import (
	"errors"
	"net/http"
	"strings"

	"eeg-backend/internal/database"
	"eeg-backend/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
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

func (s *Service) GetAllUsers() ([]models.User, error) {
	return s.store.GetUsers()
}

func (s *Service) UpdateUserStatus(callerID string, targetID string, status string) (*models.User, error) {
	if status != "active" && status != "inactive" {
		return nil, errors.New("status must be 'active' or 'inactive'")
	}

	target, err := s.store.GetUserByID(targetID)
	if err != nil {
		return nil, err
	}
	if target == nil {
		return nil, errors.New("user not found")
	}

	// Protection 1: Self-deactivation prevention
	if callerID == targetID && status == "inactive" {
		return nil, errors.New("Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang aktif digunakan")
	}

	// Protection 2: Primary Superadmin & Admin accounts protection
	if (strings.EqualFold(target.Email, "admin@gmail.com") || target.Role == "superadmin") && status == "inactive" {
		return nil, errors.New("Akun Superadmin sistem memiliki proteksi permanen dan tidak dapat dinonaktifkan")
	}
	if strings.EqualFold(target.Email, "virzasiutaa@gmail.com") && status == "inactive" {
		return nil, errors.New("Akun Administrator virzasiutaa@gmail.com memiliki proteksi sistem dan tidak dapat dinonaktifkan")
	}

	if err := s.store.UpdateUserStatus(targetID, status); err != nil {
		return nil, err
	}

	target.Status = status
	return target, nil
}

func (s *Service) ResetUserPassword(callerID string, targetID string, req *models.AdminResetPasswordRequest) error {
	if len(req.NewPassword) < 8 {
		return errors.New("Kata sandi baru minimal harus 8 karakter")
	}
	if req.NewPassword != req.ConfirmPassword {
		return errors.New("Konfirmasi kata sandi tidak cocok dengan kata sandi baru")
	}

	target, err := s.store.GetUserByID(targetID)
	if err != nil {
		return err
	}
	if target == nil {
		return errors.New("user not found")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return s.store.ResetUserPassword(targetID, string(hashed))
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func isAuthorizedAdmin(role string) bool {
	r := strings.ToLower(role)
	return r == "superadmin" || r == "admin"
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

func (h *Handler) GetAllUsers(c *gin.Context) {
	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	if !isAuthorizedAdmin(roleStr) {
		c.JSON(http.StatusForbidden, models.APIResponse{
			Success: false,
			Error:   "Akses ditolak: Hanya administrator yang berwenang mengakses data pengguna",
		})
		return
	}

	usersList, err := h.service.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   "Gagal memuat daftar pengguna: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    usersList,
	})
}

func (h *Handler) UpdateStatus(c *gin.Context) {
	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	if !isAuthorizedAdmin(roleStr) {
		c.JSON(http.StatusForbidden, models.APIResponse{
			Success: false,
			Error:   "Akses ditolak: Hanya administrator yang dapat mengubah status akun",
		})
		return
	}

	callerID, _ := c.Get("userID")
	callerIDStr, _ := callerID.(string)
	targetID := c.Param("id")

	var req models.UpdateUserStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Format status tidak valid: gunakan 'active' atau 'inactive'",
		})
		return
	}

	updatedUser, err := h.service.UpdateUserStatus(callerIDStr, targetID, req.Status)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	statusLabel := "diaktifkan"
	if req.Status == "inactive" {
		statusLabel = "dinonaktifkan"
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Akun " + updatedUser.Name + " berhasil " + statusLabel,
		Data:    updatedUser,
	})
}

func (h *Handler) ResetPassword(c *gin.Context) {
	role, _ := c.Get("role")
	roleStr, _ := role.(string)
	if !isAuthorizedAdmin(roleStr) {
		c.JSON(http.StatusForbidden, models.APIResponse{
			Success: false,
			Error:   "Akses ditolak: Hanya administrator yang dapat mereset kata sandi pengguna",
		})
		return
	}

	callerID, _ := c.Get("userID")
	callerIDStr, _ := callerID.(string)
	targetID := c.Param("id")

	var req models.AdminResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   "Permintaan reset kata sandi tidak valid: " + err.Error(),
		})
		return
	}

	if err := h.service.ResetUserPassword(callerIDStr, targetID, &req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Message: "Kata sandi pengguna berhasil direset",
	})
}
