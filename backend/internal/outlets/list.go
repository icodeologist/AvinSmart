package outlets

import (
	"net/http"

	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

func ListOutlets(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var outlets []models.Outlet
		if err := db.Order("created_at desc").Find(&outlets).Error; err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "could not fetch outlets",
			})
			return
		}

		writeJSON(w, http.StatusOK, outlets)
	}
}
