package products

import (
	"net/http"
	"strconv"
	"strings"

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
		if search := strings.TrimSpace(r.URL.Query().Get("q")); search != "" {
			like := "%" + search + "%"
			query = query.Where("title ILIKE ? OR sku_id ILIKE ?", like, like)
		}

		if err := query.Order("created_at desc").Limit(20).Find(&products).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch products")
			return
		}

		api.WriteSuccess(w, http.StatusOK, products)
	}
}
