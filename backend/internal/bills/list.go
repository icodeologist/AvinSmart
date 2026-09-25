package bills

import (
	"net/http"
	"strconv"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/outletaccess"

	"gorm.io/gorm"
)

func ListBills(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var bills []models.Bill
		query, err := outletaccess.WhereAllowed(db, principal, db.Preload("Items").Preload("Outlet"), "bills.outlet_id")
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not check outlet access")
			return
		}
		if rawOutletID := r.URL.Query().Get("outlet_id"); rawOutletID != "" {
			outletID, parseErr := strconv.ParseUint(rawOutletID, 10, 32)
			if parseErr != nil || outletID == 0 {
				api.WriteError(w, http.StatusBadRequest, "outlet_id must be a positive integer")
				return
			}
			allowed, accessErr := outletaccess.CanAccess(db, principal, uint(outletID))
			if accessErr != nil {
				api.WriteError(w, http.StatusInternalServerError, "could not check outlet access")
				return
			}
			if !allowed {
				api.WriteError(w, http.StatusForbidden, "you do not have access to this outlet")
				return
			}
			query = query.Where("bills.outlet_id = ?", outletID)
		}

		if err := query.Order("bills.created_at desc").Find(&bills).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch bills")
			return
		}

		api.WriteSuccess(w, http.StatusOK, bills)
	}
}
