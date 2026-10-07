package auth

import (
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type registerAdminRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	PhoneNum string `json:"phone_num"`
}

func (r *registerAdminRequest) validate() api.Fields {
	fields := api.NewFields()
	r.Username = strings.TrimSpace(r.Username)
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	r.PhoneNum = strings.TrimSpace(r.PhoneNum)

	if r.Username == "" {
		fields.Add("username", "admin name is required")
	}
	if r.Email == "" {
		fields.Add("email", "email is required")
	} else if !api.IsValidEmail(r.Email) {
		fields.Add("email", "email must be valid")
	}
	if len(r.Password) < 8 {
		fields.Add("password", "password must be at least 8 characters")
	}
	if r.PhoneNum == "" {
		fields.Add("phone_num", "phone number is required")
	}

	return fields
}

// RegisterAdmin is intentionally public only when PUBLIC_ADMIN_REGISTRATION is
// enabled. It returns a session token so a test user can enter the app directly
// after registration.
func RegisterAdmin(db *gorm.DB, cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !cfg.PublicAdminRegistration {
			api.WriteError(w, http.StatusNotFound, "admin registration is not available")
			return
		}

		var payload registerAdminRequest
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
			api.WriteError(w, http.StatusInternalServerError, "could not secure admin password")
			return
		}

		admin := models.Admin{
			Username:     payload.Username,
			Email:        payload.Email,
			PasswordHash: string(passwordHash),
			PhoneNum:     payload.PhoneNum,
		}
		if err := db.Create(&admin).Error; err != nil {
			if api.IsUniqueViolation(err) {
				returnConflict(w, db, payload.Email, payload.Username)
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not create admin")
			return
		}

		token, err := IssueToken(cfg, admin.ID, admin.Email, "admin", "admin")
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not create auth token")
			return
		}

		api.WriteSuccess(w, http.StatusCreated, map[string]any{
			"token": token,
			"user":  admin,
		})
	}
}

func returnConflict(w http.ResponseWriter, db *gorm.DB, email, username string) {
	var existing models.Admin
	if err := db.Select("email", "username").Where("email = ? OR username = ?", email, username).First(&existing).Error; err == nil {
		if strings.EqualFold(existing.Email, email) {
			api.WriteError(w, http.StatusConflict, "admin email already exists")
			return
		}
	}
	api.WriteError(w, http.StatusConflict, "admin name already exists")
}
