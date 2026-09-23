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
		query := db.Preload("Staff").Order("pay_period desc, created_at desc")
		if month := r.URL.Query().Get("pay_period"); month != "" {
			query = query.Where("pay_period = ?", month)
		}
		if err := query.Find(&records).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch salary records")
			return
		}
		api.WriteSuccess(w, http.StatusOK, records)
	}
}
