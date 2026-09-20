package categories

import (
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

var validTypes = map[string]bool{"product": true, "service": true, "material": true}

type createRequest struct {
	Name          string   `json:"name"`
	Type          string   `json:"type"`
	SubCategories []string `json:"sub_categories"`
}

func (r *createRequest) validate() api.Fields {
	fields := api.NewFields()
	r.Name = strings.TrimSpace(r.Name)
	r.Type = strings.ToLower(strings.TrimSpace(r.Type))
	if r.Name == "" {
		fields.Add("name", "name is required")
	}
	if r.Type == "" {
		r.Type = "product"
	} else if !validTypes[r.Type] {
		fields.Add("type", "type must be one of product, service, material")
	}
	return fields
}

func Create(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload createRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}

		category := models.Category{Name: payload.Name, Type: payload.Type}
		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&category).Error; err != nil {
				return err
			}
			seen := make(map[string]bool)
			for _, rawName := range payload.SubCategories {
				name := strings.TrimSpace(rawName)
				if name == "" || seen[strings.ToLower(name)] {
					continue
				}
				seen[strings.ToLower(name)] = true
				if err := tx.Create(&models.SubCategory{CategoryID: category.ID, Name: name}).Error; err != nil {
					return err
				}
			}
			return nil
		})
		if err != nil {
			if api.IsUniqueViolation(err) {
				api.WriteError(w, http.StatusConflict, "category already exists")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not create category")
			return
		}

		db.Preload("SubCategories").First(&category, category.ID)
		api.WriteSuccess(w, http.StatusCreated, category)
	}
}
