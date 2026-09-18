package salaries

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func MarkPaid(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseUint(chi.URLParam(r, "id"), 10, 64)
		if err != nil || id == 0 {
			api.WriteError(w, http.StatusBadRequest, "salary id must be a positive integer")
			return
		}

		var record models.Salary
		if err := db.First(&record, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				api.WriteError(w, http.StatusNotFound, "salary record not found")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not find salary record")
			return
		}

		now := time.Now()
		record.Status = "paid"
		record.PaidAt = &now
		if err := db.Save(&record).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not mark salary as paid")
			return
		}

		db.Preload("Staff").First(&record, record.ID)
		api.WriteSuccess(w, http.StatusOK, record)
	}
}
