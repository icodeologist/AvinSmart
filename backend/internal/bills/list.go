package bills

import (
	"net/http"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

func ListBills(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var bills []models.Bill

		if err := db.Preload("Items").Order("created_at desc").Find(&bills).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch bills")
			return
		}

		api.WriteSuccess(w, http.StatusOK, bills)
	}
}