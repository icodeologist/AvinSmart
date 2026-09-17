package products

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"avinsmart/backend/internal/models"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

type createProductRequest struct {
	Title           string  `json:"title"`
	SKUID           string  `json:"sku_id"`
	RetailPrice     float64 `json:"retail_price"`
	Quantity        int     `json:"quantity"`
	CategoryName    string  `json:"category_name"`
	SubCategoryName string  `json:"sub_category_name"`
	Image           string  `json:"image"`
	Description     string  `json:"description"`
}

func CreateProduct(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload createProductRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "invalid json body",
			})
			return
		}

		payload.Title = strings.TrimSpace(payload.Title)
		payload.SKUID = strings.TrimSpace(payload.SKUID)
		payload.CategoryName = strings.TrimSpace(payload.CategoryName)
		payload.SubCategoryName = strings.TrimSpace(payload.SubCategoryName)
		payload.Image = strings.TrimSpace(payload.Image)
		payload.Description = strings.TrimSpace(payload.Description)

		if payload.Title == "" || payload.SKUID == "" || payload.CategoryName == "" || payload.SubCategoryName == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "title, sku_id, category_name, and sub_category_name are required",
			})
			return
		}

		if payload.RetailPrice < 0 || payload.Quantity < 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "retail_price and quantity cannot be negative",
			})
			return
		}

		var category models.Category
		if err := db.Where(models.Category{Name: payload.CategoryName}).FirstOrCreate(&category).Error; err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "could not prepare category",
			})
			return
		}

		var subCategory models.SubCategory
		if err := db.Where(models.SubCategory{
			CategoryID: category.ID,
			Name:       payload.SubCategoryName,
		}).FirstOrCreate(&subCategory).Error; err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "could not prepare subcategory",
			})
			return
		}

		product := models.Product{
			Title:         payload.Title,
			Description:   payload.Description,
			CategoryID:    category.ID,
			SubCategoryID: &subCategory.ID,
			SKUID:         payload.SKUID,
			Quantity:      payload.Quantity,
			RetailPrice:   payload.RetailPrice,
			Image:         payload.Image,
		}

		if err := db.Create(&product).Error; err != nil {
			if isUniqueViolation(err) {
				writeJSON(w, http.StatusConflict, map[string]string{
					"error": "product sku already exists",
				})
				return
			}

			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "could not create product",
			})
			return
		}

		writeJSON(w, http.StatusCreated, product)
	}
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
