package profile

import (
	"errors"
	"net/http"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type verifyPasswordRequest struct {
	Password string `json:"password"`
}

// VerifyAdminPassword confirms the signed-in administrator's password before
// opening a sensitive in-app view. It does not issue or extend any token.
func VerifyAdminPassword(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok || principal.Role != "admin" || principal.UserType != "admin" {
			api.WriteError(w, http.StatusForbidden, "administrator access is required")
			return
		}

		var payload verifyPasswordRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if payload.Password == "" {
			api.WriteValidation(w, "invalid request payload", api.Fields{"password": {"password is required"}})
			return
		}

		var admin models.Admin
		if err := db.First(&admin, principal.UserID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				api.WriteError(w, http.StatusUnauthorized, "account not found")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not verify password")
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(payload.Password)); err != nil {
			api.WriteError(w, http.StatusUnauthorized, "password is incorrect")
			return
		}

		api.WriteSuccess(w, http.StatusOK, map[string]bool{"verified": true})
	}
}
