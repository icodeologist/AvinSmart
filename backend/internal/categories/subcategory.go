package categories

import (
	"net/http"
	"strconv"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type createSubCategoryRequest struct {
	Name string `json:"name"`
}

func CreateSubCategory(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		categoryID, err := strconv.ParseUint(chi.URLParam(r, "categoryID"), 10, 64)
		if err != nil || categoryID == 0 {
			api.WriteError(w, http.StatusBadRequest, "invalid category id")
			return
		}

		var payload createSubCategoryRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		payload.Name = strings.TrimSpace(payload.Name)
		if payload.Name == "" {
			fields := api.NewFields()
			fields.Add("name", "name is required")
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}

		var category models.Category
		if err := db.First(&category, uint(categoryID)).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				api.WriteError(w, http.StatusNotFound, "category not found")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not fetch category")
			return
		}

		subCategory := models.SubCategory{CategoryID: category.ID, Name: payload.Name}
		if err := db.Create(&subCategory).Error; err != nil {
			if api.IsUniqueViolation(err) {
				api.WriteError(w, http.StatusConflict, "subcategory already exists in this category")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not create subcategory")
			return
		}

		api.WriteSuccess(w, http.StatusCreated, subCategory)
	}
}
