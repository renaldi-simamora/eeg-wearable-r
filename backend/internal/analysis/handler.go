package analysis

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

func (s *Service) GetAnalysisBySession(sessionID string) (map[string]interface{}, error) {
	predictions, err := s.store.GetMLPredictions(sessionID)
	if err != nil {
		return nil, err
	}

	insights, err := s.store.GetAIInsights(sessionID)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"sessionId":        sessionID,
		"status":           "unprocessed",
		"message":          "Machine-learning classification will appear here.",
		"notice":           "Machine-learning results will be available after the ML service is integrated.",
		"pipelineReady":    true,
		"futureServiceUrl": "http://localhost:5000/predict (Python FastAPI ML service)",
		"predictions":      predictions,
		"insights":         insights,
	}, nil
}

func (s *Service) GetModels() []models.ModelCardInfo {
	return []models.ModelCardInfo{
		{
			ID:         "svm-classifier",
			Name:       "Support Vector Machine (SVM)",
			Definition: "Supervised classification using RBF/Linear kernel on extracted band-power feature vectors (Delta, Theta, Alpha, Beta, Gamma).",
			Status:     "Not connected",
			Metrics: map[string]interface{}{
				"accuracy":  nil,
				"precision": nil,
				"recall":    nil,
				"macroF1":   nil,
			},
			FutureNote: "Evaluation data will be populated after the ML pipeline is connected.",
		},
		{
			ID:         "rf-classifier",
			Name:       "Random Forest",
			Definition: "Ensemble learning method operating by constructing a multitude of decision trees for robust non-linear EEG pattern categorization.",
			Status:     "Not connected",
			Metrics: map[string]interface{}{
				"accuracy":  nil,
				"precision": nil,
				"recall":    nil,
				"macroF1":   nil,
			},
			FutureNote: "Evaluation data will be populated after the ML pipeline is connected.",
		},
		{
			ID:         "xgboost-classifier",
			Name:       "XGBoost",
			Definition: "Scalable gradient-boosted tree algorithm optimized for sequential residual reduction in high-variance EEG feature matrices.",
			Status:     "Not connected",
			Metrics: map[string]interface{}{
				"accuracy":  nil,
				"precision": nil,
				"recall":    nil,
				"macroF1":   nil,
			},
			FutureNote: "Evaluation data will be populated after the ML pipeline is connected.",
		},
	}
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetAnalysis(c *gin.Context) {
	sessionID := c.Param("sessionId")
	res, err := h.service.GetAnalysisBySession(sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    res,
	})
}

func (h *Handler) GetModels(c *gin.Context) {
	modelsList := h.service.GetModels()
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    modelsList,
	})
}
