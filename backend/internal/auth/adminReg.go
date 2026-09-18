package auth

import (
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type registerAdminRequest struct {
	Username        string `json:"username"`
	Email           string `json:"email"`
	Password        string `json:"password"`
	ReenterPassword string `json:"reenter_password"`
	PhoneNum        string `json:"phone_num"`
}

func (r *registerAdminRequest) validate() api.Fields {
	fields := api.Fields{}

	r.Username = strings.TrimSpace(r.Username)
	r.Email = strings.TrimSpace(r.Email)
	r.PhoneNum = strings.TrimSpace(r.PhoneNum)

	if r.Username == "" {
		fields.Add("username", "username is required")
	}

	if r.Email == "" {
		fields.Add("email", "email is required")
	} else if !api.IsValidEmail(r.Email) {
		fields.Add("email", "email must be valid")
	}

	if r.Password == "" {
		fields.Add("password", "password is required")
	} else if len(r.Password) < 8 {
		fields.Add("password", "password must be at least 8 characters")
	}

	if r.ReenterPassword == "" {
		fields.Add("reenter_password", "reenter_password is required")
	} else if r.Password != r.ReenterPassword {
		fields.Add("reenter_password", "password and reenter_password must match")
	}

	if r.PhoneNum == "" {
		fields.Add("phone_num", "phone_num is required")
	}

	return fields
}

func RegisterAdmin(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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
			api.WriteError(w, http.StatusInternalServerError, "could not secure password")
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
				api.WriteError(w, http.StatusConflict, "admin username or email already exists")
				return
			}

			api.WriteError(w, http.StatusInternalServerError, "could not create admin")
			return
		}

		api.WriteSuccess(w, http.StatusCreated, admin)
	}
}
