package profile

import (
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

type updateRequest struct {
	Name        string `json:"name"`
	PhotoBase64 string `json:"photo_base64"`
}

func Update(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var payload updateRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		payload.Name = strings.TrimSpace(payload.Name)
		if payload.Name == "" {
			api.WriteValidation(w, "invalid request payload", api.Fields{"name": {"name is required"}})
			return
		}

		photo := ""
		var err error
		if strings.TrimSpace(payload.PhotoBase64) != "" {
			photo, err = savePhoto(payload.PhotoBase64)
			if err != nil {
				api.WriteError(w, http.StatusBadRequest, "invalid profile photo")
				return
			}
		}

		if principal.UserType == "admin" || principal.Role == "admin" {
			var account models.Admin
			if err := db.First(&account, principal.UserID).Error; err != nil {
				api.WriteError(w, http.StatusNotFound, "profile not found")
				return
			}
			updates := map[string]any{"username": payload.Name}
			if photo != "" {
				updates["photo"] = photo
			}
			if err := db.Model(&account).Updates(updates).Error; err != nil {
				api.WriteError(w, http.StatusInternalServerError, "could not update profile")
				return
			}
			db.First(&account, principal.UserID)
			api.WriteSuccess(w, http.StatusOK, account)
			return
		}

		var account models.Staff
		if err := db.First(&account, principal.UserID).Error; err != nil {
			api.WriteError(w, http.StatusNotFound, "profile not found")
			return
		}
		updates := map[string]any{"name": payload.Name}
		if photo != "" {
			updates["photo"] = photo
		}
		if err := db.Model(&account).Updates(updates).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not update profile")
			return
		}
		db.Preload("Outlets").First(&account, principal.UserID)
		api.WriteSuccess(w, http.StatusOK, account)
	}
}

func savePhoto(dataURI string) (string, error) {
	comma := strings.Index(dataURI, "base64,")
	if comma < 0 {
		return "", errors.New("invalid data uri")
	}
	raw, err := base64.StdEncoding.DecodeString(dataURI[comma+len("base64,"):])
	if err != nil || len(raw) == 0 || len(raw) > 10<<20 {
		return "", errors.New("invalid photo data")
	}
	ext := map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}[http.DetectContentType(raw)]
	if ext == "" {
		return "", errors.New("unsupported photo type")
	}
	const uploadDir = "static/images/uploads"
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return "", err
	}
	name := fmt.Sprintf("profile-%d%s", time.Now().UnixNano(), ext)
	if err := os.WriteFile(filepath.Join(uploadDir, name), raw, 0o644); err != nil {
		return "", err
	}
	return "/static/images/uploads/" + name, nil
}
