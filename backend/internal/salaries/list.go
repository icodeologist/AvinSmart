package salaries

import (
	"net/http"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

func List(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var records []models.Salary
		if err := db.Preload("Staff").Order("pay_period desc, created_at desc").Find(&records).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch salary records")
			return
		}
		api.WriteSuccess(w, http.StatusOK, records)
	}
}
