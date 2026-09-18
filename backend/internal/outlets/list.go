package outlets

import (
	"net/http"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

func ListOutlets(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var outlets []models.Outlet
		if err := db.Order("created_at desc").Find(&outlets).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch outlets")
			return
		}

		api.WriteSuccess(w, http.StatusOK, outlets)
	}
}
