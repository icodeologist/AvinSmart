package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"avinsmart/backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type loginAdminRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func LoginAdmin(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload loginAdminRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "invalid json body",
			})
			return
		}

		payload.Email = strings.TrimSpace(payload.Email)

		if payload.Email == "" || payload.Password == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "email and password are required",
			})
			return
		}

		if !strings.Contains(payload.Email, "@") {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "email must be valid",
			})
			return
		}

		var admin models.Admin
		if err := db.Where("email = ?", payload.Email).First(&admin).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				writeJSON(w, http.StatusUnauthorized, map[string]string{
					"error": "invalid email or password",
				})
				return
			}

			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "could not login admin",
			})
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(payload.Password)); err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "invalid email or password",
			})
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"message": "login successful",
			"admin":   admin,
		})
	}
}
