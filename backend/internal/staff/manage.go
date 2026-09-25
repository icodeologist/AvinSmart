package staff

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/auth"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/outletaccess"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type updateRequest struct {
	Name      string  `json:"name"`
	Email     string  `json:"email"`
	Phone     string  `json:"phone"`
	Role      string  `json:"role"`
	Status    string  `json:"status"`
	OutletIDs *[]uint `json:"outlet_ids"`
}

type passwordRequest struct {
	Password        string `json:"password"`
	ReenterPassword string `json:"reenter_password"`
}

func parseID(r *http.Request) (uint, error) {
	value, err := strconv.ParseUint(chi.URLParam(r, "id"), 10, 32)
	return uint(value), err
}

func findMember(db *gorm.DB, id uint) (models.Staff, error) {
	var member models.Staff
	err := db.Preload("Outlets").First(&member, id).Error
	return member, err
}

func canManageMember(principal auth.Principal, member models.Staff, db *gorm.DB) error {
	if principal.UserType == "admin" || principal.Role == "admin" {
		return nil
	}
	ids := make([]uint, 0, len(member.Outlets))
	for _, outlet := range member.Outlets {
		ids = append(ids, outlet.ID)
	}
	return outletaccess.ValidateAssignments(db, principal, ids)
}

func Update(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		id, err := parseID(r)
		if err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid staff id")
			return
		}

		var payload updateRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		fields := validateUpdate(&payload)
		if fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}
		if payload.OutletIDs != nil && requiresOutlet(payload.Role) && len(*payload.OutletIDs) == 0 {
			fields.Add("outlet_ids", "at least one outlet is required for this role")
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}

		member, err := findMember(db, id)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			api.WriteError(w, http.StatusNotFound, "staff member not found")
			return
		}
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch staff member")
			return
		}
		if err := canManageMember(principal, member, db); err != nil {
			api.WriteError(w, http.StatusForbidden, "you do not manage this staff member's outlets")
			return
		}
		if payload.OutletIDs != nil {
			if err := outletaccess.ValidateAssignments(db, principal, *payload.OutletIDs); err != nil {
				if errors.Is(err, outletaccess.ErrOutletForbidden) {
					api.WriteError(w, http.StatusForbidden, err.Error())
				} else {
					api.WriteError(w, http.StatusBadRequest, err.Error())
				}
				return
			}
		}

		member.Name = payload.Name
		member.Email = payload.Email
		member.Phone = payload.Phone
		member.Role = payload.Role
		member.Status = payload.Status
		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Save(&member).Error; err != nil {
				return err
			}
			if payload.OutletIDs == nil {
				return nil
			}
			outlets, err := loadActiveOutlets(tx, *payload.OutletIDs)
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
			api.WriteError(w, http.StatusInternalServerError, "could not update staff member")
			return
		}
		db.Preload("Outlets").First(&member, member.ID)
		api.WriteSuccess(w, http.StatusOK, member)
	}
}

func validateUpdate(payload *updateRequest) api.Fields {
	fields := api.NewFields()
	payload.Name = strings.TrimSpace(payload.Name)
	payload.Email = strings.TrimSpace(strings.ToLower(payload.Email))
	payload.Phone = strings.TrimSpace(payload.Phone)
	payload.Role = strings.TrimSpace(strings.ToLower(payload.Role))
	payload.Status = strings.TrimSpace(strings.ToLower(payload.Status))

	if payload.Name == "" {
		fields.Add("name", "name is required")
	}
	if payload.Email == "" || !api.IsValidEmail(payload.Email) {
		fields.Add("email", "email must be valid")
	}
	if payload.Phone == "" {
		fields.Add("phone", "phone is required")
	}
	if !validRoles[payload.Role] {
		fields.Add("role", "role must be one of: manager, sales, inventory, support")
	}
	if payload.Status != "active" && payload.Status != "inactive" {
		fields.Add("status", "status must be active or inactive")
	}
	return fields
}

func ChangePassword(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		id, err := parseID(r)
		if err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid staff id")
			return
		}
		var payload passwordRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		fields := api.NewFields()
		if len(payload.Password) < 8 {
			fields.Add("password", "password must be at least 8 characters")
		}
		if payload.Password != payload.ReenterPassword {
			fields.Add("reenter_password", "passwords must match")
		}
		if fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}

		member, err := findMember(db, id)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			api.WriteError(w, http.StatusNotFound, "staff member not found")
			return
		}
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch staff member")
			return
		}
		if err := canManageMember(principal, member, db); err != nil {
			api.WriteError(w, http.StatusForbidden, "you do not manage this staff member's outlets")
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(payload.Password), bcrypt.DefaultCost)
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not secure staff password")
			return
		}
		if err := db.Model(&member).Update("password_hash", string(hash)).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not update staff password")
			return
		}
		api.WriteSuccess(w, http.StatusOK, map[string]bool{"updated": true})
	}
}

func Delete(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		id, err := parseID(r)
		if err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid staff id")
			return
		}
		member, err := findMember(db, id)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			api.WriteError(w, http.StatusNotFound, "staff member not found")
			return
		}
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch staff member")
			return
		}
		if err := canManageMember(principal, member, db); err != nil {
			api.WriteError(w, http.StatusForbidden, "you do not manage this staff member's outlets")
			return
		}
		result := db.Delete(&models.Staff{}, id)
		if result.Error != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not delete staff member")
			return
		}
		if result.RowsAffected == 0 {
			api.WriteError(w, http.StatusNotFound, "staff member not found")
			return
		}
		api.WriteSuccess(w, http.StatusOK, map[string]bool{"deleted": true})
	}
}
