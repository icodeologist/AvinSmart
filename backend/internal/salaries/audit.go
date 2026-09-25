package salaries

import (
	"net/http"
	"strconv"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

func ListAudit(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := db.Order("created_at desc").Limit(200)
		if entity := strings.TrimSpace(r.URL.Query().Get("entity")); entity != "" {
			query = query.Where("entity = ?", entity)
		}
		if value := strings.TrimSpace(r.URL.Query().Get("entity_id")); value != "" {
			id, err := strconv.ParseUint(value, 10, 32)
			if err != nil || id == 0 {
				api.WriteError(w, http.StatusBadRequest, "entity_id must be a positive integer")
				return
			}
			query = query.Where("entity_id = ?", id)
		}
		var records []models.PayrollAudit
		if err := query.Find(&records).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch payroll audit history")
			return
		}
		api.WriteSuccess(w, http.StatusOK, records)
	}
}
