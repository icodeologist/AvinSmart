package inventory

import (
	"net/http"
	"strconv"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/outletaccess"

	"gorm.io/gorm"
)

func ListMovements(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		query, err := outletaccess.WhereAllowed(db, principal, db.Preload("Product"), "inventory_movements.outlet_id")
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
			query = query.Where("inventory_movements.outlet_id = ?", outletID)
		}
		if rawProductID := r.URL.Query().Get("product_id"); rawProductID != "" {
			productID, parseErr := strconv.ParseUint(rawProductID, 10, 32)
			if parseErr != nil || productID == 0 {
				api.WriteError(w, http.StatusBadRequest, "product_id must be a positive integer")
				return
			}
			query = query.Where("inventory_movements.product_id = ?", productID)
		}
		var movements []models.InventoryMovement
		if err := query.Order("inventory_movements.created_at desc").Limit(200).Find(&movements).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch inventory movements")
			return
		}
		api.WriteSuccess(w, http.StatusOK, movements)
	}
}

func ListTransfers(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		query := db.Order("created_at desc").Limit(200)
		ids, err := outletaccess.AllowedOutletIDs(db, principal)
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not check outlet access")
			return
		}
		if ids != nil {
			if len(ids) == 0 {
				query = query.Where("1 = 0")
			} else {
				query = query.Where("source_outlet_id IN ? AND destination_outlet_id IN ?", ids, ids)
			}
		}
		var transfers []models.InventoryTransfer
		if err := query.Find(&transfers).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch inventory transfers")
			return
		}
		api.WriteSuccess(w, http.StatusOK, transfers)
	}
}
