package staff

import (
	"net/http"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/outletaccess"

	"gorm.io/gorm"
)

func List(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var members []models.Staff
		query := db.Preload("Outlets")
		ids, err := outletaccess.AllowedOutletIDs(db, principal)
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not check staff outlet access")
			return
		}
		if ids != nil {
			if len(ids) == 0 {
				query = query.Where("1 = 0")
			} else {
				query = query.Where("id IN (SELECT staff_id FROM staff_outlets WHERE outlet_id IN ?)", ids)
			}
		}
		if err := query.Order("created_at desc").Find(&members).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch staff")
			return
		}

		api.WriteSuccess(w, http.StatusOK, members)
	}
}
