package products

import (
	"net/http"
	"strconv"

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
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "could not fetch products",
			})
			return
		}

		writeJSON(w, http.StatusOK, products)
	}
}
