package staff

import (
	"errors"
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/auth"
	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

func (r *loginRequest) validate() api.Fields {
	fields := api.NewFields()
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	r.Role = strings.TrimSpace(strings.ToLower(r.Role))
	if r.Email == "" || !api.IsValidEmail(r.Email) {
		fields.Add("email", "email must be valid")
	}
	if r.Password == "" {
		fields.Add("password", "password is required")
	}
	if r.Role != "sales" && r.Role != "inventory_staff" {
		fields.Add("role", "role must be sales or inventory_staff")
	}
	return fields
}

func Login(db *gorm.DB, cfg config.Config) http.HandlerFunc {
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
		if err := db.Preload("Outlets").Where("email = ?", payload.Email).First(&member).Error; err != nil {
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
		if member.Role != payload.Role {
			api.WriteError(w, http.StatusUnauthorized, "this staff account is not assigned to the selected role")
			return
		}

		token, err := auth.IssueToken(cfg, member.ID, member.Email, member.Role, "staff")
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not create auth token")
			return
		}

		api.WriteSuccess(w, http.StatusOK, map[string]any{
			"token": token,
			"user":  member,
		})
	}
}
