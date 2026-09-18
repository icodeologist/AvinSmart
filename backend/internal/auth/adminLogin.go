package auth

import (
	"errors"
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type loginAdminRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (r *loginAdminRequest) validate() api.Fields {
	fields := api.Fields{}

	r.Email = strings.TrimSpace(r.Email)

	if r.Email == "" {
		fields.Add("email", "email is required")
	} else if !api.IsValidEmail(r.Email) {
		fields.Add("email", "email must be valid")
	}

	if r.Password == "" {
		fields.Add("password", "password is required")
	}

	return fields
}

func LoginAdmin(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload loginAdminRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}

		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}

		var admin models.Admin
		if err := db.Where("email = ?", payload.Email).First(&admin).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				api.WriteError(w, http.StatusUnauthorized, "invalid email or password")
				return
			}

			api.WriteError(w, http.StatusInternalServerError, "could not login admin")
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(payload.Password)); err != nil {
			api.WriteError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}

		api.WriteSuccess(w, http.StatusOK, admin)
	}
}
