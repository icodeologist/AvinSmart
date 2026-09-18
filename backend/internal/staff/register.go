package staff

import (
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var validRoles = map[string]bool{
	"manager":   true,
	"sales":     true,
	"inventory": true,
	"support":   true,
}

type registerRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
}

func (r *registerRequest) validate() api.Fields {
	fields := api.NewFields()
	r.Name = strings.TrimSpace(r.Name)
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	r.Phone = strings.TrimSpace(r.Phone)
	r.Role = strings.TrimSpace(strings.ToLower(r.Role))

	if r.Name == "" {
		fields.Add("name", "name is required")
	}
	if r.Email == "" {
		fields.Add("email", "email is required")
	} else if !api.IsValidEmail(r.Email) {
		fields.Add("email", "email must be valid")
	}
	if len(r.Password) < 8 {
		fields.Add("password", "password must be at least 8 characters")
	}
	if r.Phone == "" {
		fields.Add("phone", "phone is required")
	}
	if !validRoles[r.Role] {
		fields.Add("role", "role must be one of: manager, sales, inventory, support")
	}

	return fields
}

func Register(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload registerRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}

		passwordHash, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not secure staff password")
			return
		}

		member := models.Staff{
			Name:         payload.Name,
			Email:        payload.Email,
			PasswordHash: string(passwordHash),
			Phone:        payload.Phone,
			Role:         payload.Role,
			Status:       "active",
		}

		if err := db.Create(&member).Error; err != nil {
			if api.IsUniqueViolation(err) {
				api.WriteError(w, http.StatusConflict, "staff email already exists")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not create staff")
			return
		}

		api.WriteSuccess(w, http.StatusCreated, member)
	}
}
