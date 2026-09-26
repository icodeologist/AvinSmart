package staff

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
	"avinsmart/backend/internal/outletaccess"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var validRoles = map[string]bool{
	"sales":           true,
	"inventory_staff": true,
}

type registerRequest struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	Phone       string `json:"phone"`
	Role        string `json:"role"`
	OutletIDs   []uint `json:"outlet_ids"`
	PhotoBase64 string `json:"photo_base64"`
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
	if strings.TrimSpace(r.PhotoBase64) == "" {
		fields.Add("photo", "a profile photo is required")
	}
	if !validRoles[r.Role] {
		fields.Add("role", "role must be one of: sales, inventory_staff")
	}
	if requiresOutlet(r.Role) && len(r.OutletIDs) == 0 {
		fields.Add("outlet_ids", "at least one outlet is required for this role")
	}

	return fields
}

func Register(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var payload registerRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}
		if err := outletaccess.ValidateAssignments(db, principal, payload.OutletIDs); err != nil {
			if errors.Is(err, outletaccess.ErrOutletForbidden) {
				api.WriteError(w, http.StatusForbidden, err.Error())
			} else {
				api.WriteError(w, http.StatusBadRequest, err.Error())
			}
			return
		}

		passwordHash, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not secure staff password")
			return
		}
		photo, err := saveStaffPhoto(payload.PhotoBase64)
		if err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid profile photo")
			return
		}

		member := models.Staff{
			Name:         payload.Name,
			Email:        payload.Email,
			PasswordHash: string(passwordHash),
			Phone:        payload.Phone,
			Role:         payload.Role,
			Status:       "active",
			Photo:        photo,
		}

		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&member).Error; err != nil {
				return err
			}
			outlets, err := loadActiveOutlets(tx, payload.OutletIDs)
			if err != nil {
				return err
			}
			return tx.Model(&member).Association("Outlets").Replace(outlets)
		})
		if err != nil {
			if api.IsUniqueViolation(err) {
				api.WriteError(w, http.StatusConflict, "staff email already exists")
				return
			}
			if errors.Is(err, errOutletAssignment) {
				api.WriteError(w, http.StatusBadRequest, err.Error())
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not create staff")
			return
		}
		db.Preload("Outlets").First(&member, member.ID)

		api.WriteSuccess(w, http.StatusCreated, member)
	}
}

func saveStaffPhoto(dataURI string) (string, error) {
	const maxPhotoSize = 10 << 20
	comma := strings.Index(dataURI, "base64,")
	if comma < 0 {
		return "", errors.New("invalid data uri")
	}
	raw, err := base64.StdEncoding.DecodeString(dataURI[comma+len("base64,"):])
	if err != nil || len(raw) == 0 || len(raw) > maxPhotoSize {
		return "", errors.New("invalid photo data")
	}
	ext := ".png"
	switch http.DetectContentType(raw) {
	case "image/jpeg":
		ext = ".jpg"
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	case "image/gif":
		ext = ".gif"
	default:
		return "", errors.New("unsupported photo type")
	}
	const uploadDir = "static/images/uploads"
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return "", err
	}
	name := fmt.Sprintf("staff-%d%s", time.Now().UnixNano(), ext)
	if err := os.WriteFile(filepath.Join(uploadDir, name), raw, 0o644); err != nil {
		return "", err
	}
	return "/static/images/uploads/" + name, nil
}
