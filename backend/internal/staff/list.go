package staff

import (
	"net/http"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

func List(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var members []models.Staff
		if err := db.Order("created_at desc").Find(&members).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch staff")
			return
		}

		api.WriteSuccess(w, http.StatusOK, members)
	}
}
