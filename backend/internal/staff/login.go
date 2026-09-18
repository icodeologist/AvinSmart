package staff

import (
	"errors"
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (r *loginRequest) validate() api.Fields {
	fields := api.NewFields()
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	if r.Email == "" || !api.IsValidEmail(r.Email) {
		fields.Add("email", "email must be valid")
	}
	if r.Password == "" {
		fields.Add("password", "password is required")
	}
	return fields
}

func Login(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload loginRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}

		var member models.Staff
		if err := db.Where("email = ?", payload.Email).First(&member).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				api.WriteError(w, http.StatusUnauthorized, "invalid email or password")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not login staff")
			return
		}
		if member.Status != "active" || bcrypt.CompareHashAndPassword([]byte(member.PasswordHash), []byte(payload.Password)) != nil {
			api.WriteError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}

		api.WriteSuccess(w, http.StatusOK, member)
	}
}
