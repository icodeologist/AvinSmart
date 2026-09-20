package categories

import (
	"net/http"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

func List(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var records []models.Category
		if err := db.Preload("SubCategories").Order("name asc").Find(&records).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch categories")
			return
		}

		api.WriteSuccess(w, http.StatusOK, records)
	}
}
