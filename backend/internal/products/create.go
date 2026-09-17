package products

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"avinsmart/backend/internal/models"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

const (
	uploadsDir    = "static/images/uploads"
	maxUploadSize = 10 << 20 // 10 MB
)

func CreateProduct(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseMultipartForm(maxUploadSize); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "invalid form data",
			})
			return
		}

		title := strings.TrimSpace(r.FormValue("title"))
		skuID := strings.TrimSpace(r.FormValue("sku_id"))
		categoryName := strings.TrimSpace(r.FormValue("category_name"))
		subCategoryName := strings.TrimSpace(r.FormValue("sub_category_name"))
		description := strings.TrimSpace(r.FormValue("description"))
		unit := strings.TrimSpace(r.FormValue("unit"))

		retailPrice, _ := strconv.ParseFloat(r.FormValue("retail_price"), 64)
		customerDisplayPrice, _ := strconv.ParseFloat(r.FormValue("customer_display_price"), 64)
		boughtPrice, _ := strconv.ParseFloat(r.FormValue("bought_price"), 64)
		wholeSalePrice, _ := strconv.ParseFloat(r.FormValue("whole_sale_price"), 64)
		quantity, _ := strconv.Atoi(r.FormValue("quantity"))

		if title == "" || skuID == "" || categoryName == "" || subCategoryName == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "title, sku_id, category_name, and sub_category_name are required",
			})
			return
		}

		if retailPrice < 0 || quantity < 0 {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "retail_price and quantity cannot be negative",
			})
			return
		}

		imageURL := ""
		if file, header, err := r.FormFile("image"); err == nil {
			defer file.Close()
			imageURL, err = saveUploadedImage(file, header.Filename)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{
					"error": "could not save image",
				})
				return
			}
		}

		var category models.Category
		if err := db.Where(models.Category{Name: categoryName}).FirstOrCreate(&category).Error; err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "could not prepare category",
			})
			return
		}

		var subCategory models.SubCategory
		if err := db.Where(models.SubCategory{
			CategoryID: category.ID,
			Name:       subCategoryName,
		}).FirstOrCreate(&subCategory).Error; err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "could not prepare subcategory",
			})
			return
		}

		product := models.Product{
			Title:                title,
			Description:          description,
			CategoryID:           category.ID,
			SubCategoryID:        &subCategory.ID,
			SKUID:                skuID,
			Quantity:             quantity,
			Unit:                 unit,
			RetailPrice:          retailPrice,
			CustomerDisplayPrice: customerDisplayPrice,
			BoughtPrice:          boughtPrice,
			WholeSalePrice:       wholeSalePrice,
			Image:                imageURL,
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

func saveUploadedImage(file io.Reader, filename string) (string, error) {
	if err := os.MkdirAll(uploadsDir, 0o755); err != nil {
		return "", err
	}

	ext := filepath.Ext(filename)
	ext = strings.ToLower(ext)
	if ext == "" {
		ext = ".png"
	}

	name := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	savedPath := filepath.Join(uploadsDir, name)

	out, err := os.Create(savedPath)
	if err != nil {
		return "", err
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		return "", err
	}

	return "/static/images/uploads/" + name, nil
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