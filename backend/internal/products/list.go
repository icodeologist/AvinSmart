package products

import (
	"net/http"

	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

func ListProducts(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var products []models.Product
		if err := db.Preload("Category").Preload("SubCategory").Order("created_at desc").Find(&products).Error; err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "could not fetch products",
			})
			return
		}

		writeJSON(w, http.StatusOK, products)
	}
}
