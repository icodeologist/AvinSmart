package products

import (
	"net/http"
	"strconv"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/outletaccess"

	"gorm.io/gorm"
)

func ListProducts(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var products []models.Product
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}

		query := db.Preload("Category").Preload("SubCategory").Preload("Outlet")
		var accessErr error
		if rawOutletID := r.URL.Query().Get("outlet_id"); rawOutletID != "" {
			outletID, err := strconv.ParseUint(rawOutletID, 10, 32)
			if err != nil || outletID == 0 {
				api.WriteError(w, http.StatusBadRequest, "outlet_id must be a positive integer")
				return
			}
			allowed, err := outletaccess.CanAccess(db, principal, uint(outletID))
			if err != nil {
				api.WriteError(w, http.StatusInternalServerError, "could not check outlet access")
				return
			}
			if !allowed {
				api.WriteError(w, http.StatusForbidden, "you do not have access to this outlet")
				return
			}
			query = query.Where("products.outlet_id = ?", outletID)
		} else {
			query, accessErr = outletaccess.WhereAllowed(db, principal, query, "products.outlet_id")
			if accessErr != nil {
				api.WriteError(w, http.StatusInternalServerError, "could not check outlet access")
				return
			}
		}
		if search := strings.TrimSpace(r.URL.Query().Get("q")); search != "" {
			like := "%" + search + "%"
			query = query.Where("title ILIKE ? OR sku_id ILIKE ?", like, like)
		}
		if err := query.Order("created_at desc NULLS LAST, id desc").Limit(20).Find(&products).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch products")
			return
		}

		api.WriteSuccess(w, http.StatusOK, products)
	}
}
