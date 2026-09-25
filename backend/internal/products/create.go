package products

import (
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/inventory"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"
	"avinsmart/backend/internal/outletaccess"

	"gorm.io/gorm"
)

const (
	uploadsDir    = "static/images/uploads"
	maxUploadSize = 10 << 20 // 10 MB
)

type createProductRequest struct {
	Title                string       `json:"title"`
	Description          string       `json:"description"`
	OutletID             *uint        `json:"outlet_id"`
	CategoryName         string       `json:"category_name"`
	SubCategoryName      string       `json:"sub_category_name"`
	SKUID                string       `json:"sku_id"`
	Quantity             int          `json:"quantity"`
	Unit                 string       `json:"unit"`
	RetailPrice          money.Amount `json:"retail_price"`
	CustomerDisplayPrice money.Amount `json:"customer_display_price"`
	BoughtPrice          money.Amount `json:"bought_price"`
	WholeSalePrice       money.Amount `json:"whole_sale_price"`
	ImageBase64          string       `json:"image_base64"`
}

func (r *createProductRequest) validate() api.Fields {
	fields := api.Fields{}

	r.Title = strings.TrimSpace(r.Title)
	r.SKUID = strings.TrimSpace(r.SKUID)
	r.CategoryName = strings.TrimSpace(r.CategoryName)
	r.SubCategoryName = strings.TrimSpace(r.SubCategoryName)

	if r.Title == "" {
		fields.Add("title", "title is required")
	}

	if r.SKUID == "" {
		fields.Add("sku_id", "sku_id is required")
	}

	if r.CategoryName == "" {
		fields.Add("category_name", "category_name is required")
	}

	if r.SubCategoryName == "" {
		fields.Add("sub_category_name", "sub_category_name is required")
	}

	if r.OutletID == nil || *r.OutletID == 0 {
		fields.Add("outlet_id", "outlet_id is required")
	}

	if r.RetailPrice.IsNegative() {
		fields.Add("retail_price", "retail_price cannot be negative")
	}

	if r.Quantity < 0 {
		fields.Add("quantity", "quantity cannot be negative")
	}

	return fields
}

func CreateProduct(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload createProductRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}

		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}

		outletID, err := outletaccess.Resolve(db, principal, payload.OutletID)
		if err != nil {
			writeOutletError(w, err)
			return
		}

		imageURL := ""
		if payload.ImageBase64 != "" {
			var err error
			imageURL, err = saveImageFromDataURI(payload.ImageBase64)
			if err != nil {
				api.WriteError(w, http.StatusBadRequest, "invalid image_base64")
				return
			}
		}

		var category models.Category
		if err := db.Where(models.Category{Name: payload.CategoryName}).FirstOrCreate(&category).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not prepare category")
			return
		}

		var subCategory models.SubCategory
		if err := db.Where(models.SubCategory{
			CategoryID: category.ID,
			Name:       payload.SubCategoryName,
		}).FirstOrCreate(&subCategory).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not prepare subcategory")
			return
		}

		product := models.Product{
			Title:                payload.Title,
			Description:          payload.Description,
			OutletID:             outletID,
			CategoryID:           category.ID,
			SubCategoryID:        &subCategory.ID,
			SKUID:                payload.SKUID,
			Quantity:             payload.Quantity,
			Unit:                 payload.Unit,
			RetailPrice:          payload.RetailPrice,
			CustomerDisplayPrice: payload.CustomerDisplayPrice,
			BoughtPrice:          payload.BoughtPrice,
			WholeSalePrice:       payload.WholeSalePrice,
			Image:                imageURL,
		}

		actorID := principal.UserID
		if err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&product).Error; err != nil {
				return err
			}
			return inventory.Record(tx, product, product.Quantity, inventory.ReasonOpening, &actorID, "product", product.ID)
		}); err != nil {
			if api.IsUniqueViolation(err) {
				api.WriteError(w, http.StatusConflict, "product sku already exists")
				return
			}

			api.WriteError(w, http.StatusInternalServerError, "could not create product")
			return
		}

		api.WriteSuccess(w, http.StatusCreated, product)
	}
}

func writeOutletError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, outletaccess.ErrOutletRequired):
		api.WriteError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, outletaccess.ErrOutletForbidden):
		api.WriteError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, outletaccess.ErrOutletNotFound):
		api.WriteError(w, http.StatusNotFound, err.Error())
	default:
		api.WriteError(w, http.StatusBadRequest, err.Error())
	}
}

func saveImageFromDataURI(dataURI string) (string, error) {
	commaIdx := strings.Index(dataURI, "base64,")
	if commaIdx < 0 {
		return "", errors.New("invalid data uri")
	}

	encoded := dataURI[commaIdx+len("base64,"):]
	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}
	if len(raw) == 0 {
		return "", errors.New("empty image data")
	}
	if len(raw) > maxUploadSize {
		return "", errors.New("image too large")
	}

	ext := extFromMIME(http.DetectContentType(raw))
	if ext == "" {
		ext = ".png"
	}

	if err := os.MkdirAll(uploadsDir, 0o755); err != nil {
		return "", err
	}

	name := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	savedPath := filepath.Join(uploadsDir, name)

	if err := os.WriteFile(savedPath, raw, 0o644); err != nil {
		return "", err
	}

	return "/static/images/uploads/" + name, nil
}

func extFromMIME(mime string) string {
	switch mime {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	default:
		return ""
	}
}
