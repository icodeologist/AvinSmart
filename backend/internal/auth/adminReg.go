package auth

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
	PhotoBase64     string `json:"photo_base64"`
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
	if strings.TrimSpace(r.PhotoBase64) == "" {
		fields.Add("photo", "a profile photo is required")
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
		photo, err := saveAdminPhoto(payload.PhotoBase64)
		if err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid profile photo")
			return
		}

		admin := models.Admin{
			Username:     payload.Username,
			Email:        payload.Email,
			PasswordHash: string(passwordHash),
			PhoneNum:     payload.PhoneNum,
			Photo:        photo,
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

func saveAdminPhoto(dataURI string) (string, error) {
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
	name := fmt.Sprintf("admin-%d%s", time.Now().UnixNano(), ext)
	if err := os.WriteFile(filepath.Join(uploadDir, name), raw, 0o644); err != nil {
		return "", err
	}
	return "/static/images/uploads/" + name, nil
}
