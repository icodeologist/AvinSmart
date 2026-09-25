package staff

import (
	"errors"
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/outletaccess"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var validRoles = map[string]bool{
	"manager":         true,
	"sales":           true,
	"inventory":       true,
	"inventory_staff": true,
	"support":         true,
}

type registerRequest struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Phone     string `json:"phone"`
	Role      string `json:"role"`
	OutletIDs []uint `json:"outlet_ids"`
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
		fields.Add("role", "role must be one of: manager, sales, inventory, inventory_staff, support")
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

		member := models.Staff{
			Name:         payload.Name,
			Email:        payload.Email,
			PasswordHash: string(passwordHash),
			Phone:        payload.Phone,
			Role:         payload.Role,
			Status:       "active",
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
