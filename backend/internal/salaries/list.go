package salaries

import (
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

func List(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := principal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		period := strings.TrimSpace(r.URL.Query().Get("pay_period"))
		if period != "" {
			if err := validatePayPeriod(period); err != nil {
				api.WriteError(w, http.StatusBadRequest, err.Error())
				return
			}
		}
		query, err := applyStaffScope(db, actor, db.Preload("Staff").Order("pay_period desc, created_at desc"))
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not check staff access")
			return
		}
		if period != "" {
			query = query.Where("pay_period = ?", period)
		}
		var records []models.Salary
		if err := query.Find(&records).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch salary records")
			return
		}
		api.WriteSuccess(w, http.StatusOK, records)
	}
}
