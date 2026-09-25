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

func categoryID(r *http.Request) (uint, bool) {
	id, err := strconv.ParseUint(chi.URLParam(r, "categoryID"), 10, 64)
	return uint(id), err == nil && id > 0
}

func Update(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := categoryID(r)
		if !ok {
			api.WriteError(w, http.StatusBadRequest, "invalid category id")
			return
		}

		var payload createRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}

		var category models.Category
		if err := db.First(&category, id).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				api.WriteError(w, http.StatusNotFound, "category not found")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not fetch category")
			return
		}

		category.Name = strings.TrimSpace(payload.Name)
		category.Type = payload.Type
		if err := db.Save(&category).Error; err != nil {
			if api.IsUniqueViolation(err) {
				api.WriteError(w, http.StatusConflict, "category already exists")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not update category")
			return
		}

		db.Preload("SubCategories").First(&category, category.ID)
		api.WriteSuccess(w, http.StatusOK, category)
	}
}

func Delete(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := categoryID(r)
		if !ok {
			api.WriteError(w, http.StatusBadRequest, "invalid category id")
			return
		}

		var deleted int64
		err := db.Transaction(func(tx *gorm.DB) error {
			if result := tx.Where("category_id = ?", id).Delete(&models.SubCategory{}); result.Error != nil {
				return result.Error
			}
			result := tx.Delete(&models.Category{}, id)
			deleted = result.RowsAffected
			return result.Error
		})
		if err != nil {
			api.WriteError(w, http.StatusConflict, "could not delete category; remove products using it first")
			return
		}
		if deleted == 0 {
			api.WriteError(w, http.StatusNotFound, "category not found")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func DeleteSubCategory(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		categoryIDValue, ok := categoryID(r)
		if !ok {
			api.WriteError(w, http.StatusBadRequest, "invalid category id")
			return
		}
		subCategoryID, err := strconv.ParseUint(chi.URLParam(r, "subcategoryID"), 10, 64)
		if err != nil || subCategoryID == 0 {
			api.WriteError(w, http.StatusBadRequest, "invalid subcategory id")
			return
		}

		result := db.Where("id = ? AND category_id = ?", subCategoryID, categoryIDValue).Delete(&models.SubCategory{})
		if result.Error != nil {
			api.WriteError(w, http.StatusConflict, "could not delete subcategory")
			return
		}
		if result.RowsAffected == 0 {
			api.WriteError(w, http.StatusNotFound, "subcategory not found")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
