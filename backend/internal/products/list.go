package products

import (
	"net/http"
	"strconv"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

func ListProducts(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var products []models.Product

		query := db.Preload("Category").Preload("SubCategory").Preload("Outlet")
		if outletID, err := strconv.Atoi(r.URL.Query().Get("outlet_id")); err == nil && outletID > 0 {
			query = query.Where("outlet_id = ?", outletID)
		}

		if err := query.Order("created_at desc").Find(&products).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch products")
			return
		}

		api.WriteSuccess(w, http.StatusOK, products)
	}
}
