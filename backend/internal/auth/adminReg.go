package auth

import (
	"net/http"
	"strings"

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

func RegisterAdmin(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload registerAdminRequest
		if err := decodeJSONBody(r, &payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "invalid json body",
			})
			return
		}

		payload.Username = strings.TrimSpace(payload.Username)
		payload.Email = strings.TrimSpace(payload.Email)
		payload.PhoneNum = strings.TrimSpace(payload.PhoneNum)

		if payload.Username == "" || payload.Email == "" || payload.Password == "" || payload.ReenterPassword == "" || payload.PhoneNum == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "username, email, password, reenter_password, and phone_num are required",
			})
			return
		}

		if !isValidEmail(payload.Email) {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "email must be valid",
			})
			return
		}

		if len(payload.Password) < 8 {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "password must be at least 8 characters",
			})
			return
		}

		if payload.Password != payload.ReenterPassword {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "password and reenter_password must match",
			})
			return
		}

		passwordHash, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "could not secure password",
			})
			return
		}

		admin := models.Admin{
			Username:     payload.Username,
			Email:        payload.Email,
			PasswordHash: string(passwordHash),
			PhoneNum:     payload.PhoneNum,
		}

		if err := db.Create(&admin).Error; err != nil {
			if isUniqueViolation(err) {
				writeJSON(w, http.StatusConflict, map[string]string{
					"error": "admin username or email already exists",
				})
				return
			}

			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "could not create admin",
			})
			return
		}

		writeJSON(w, http.StatusCreated, admin)
	}
}
