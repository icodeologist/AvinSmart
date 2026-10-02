package staff

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/auth"
	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/notifications"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

func (r *loginRequest) validate() api.Fields {
	fields := api.NewFields()
	r.Email = strings.TrimSpace(strings.ToLower(r.Email))
	r.Role = strings.TrimSpace(strings.ToLower(r.Role))
	if r.Email == "" || !api.IsValidEmail(r.Email) {
		fields.Add("email", "email must be valid")
	}
	if r.Password == "" {
		fields.Add("password", "password is required")
	}
	if r.Role != "sales" && r.Role != "inventory_staff" {
		fields.Add("role", "role must be sales or inventory_staff")
	}
	return fields
}

func Login(db *gorm.DB, cfg config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload loginRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}

		var member models.Staff
		if err := db.Preload("Outlets").Where("email = ?", payload.Email).First(&member).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				api.WriteError(w, http.StatusUnauthorized, "invalid email or password")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not login staff")
			return
		}
		if member.Status != "active" || bcrypt.CompareHashAndPassword([]byte(member.PasswordHash), []byte(payload.Password)) != nil {
			api.WriteError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		if member.Role != payload.Role {
			api.WriteError(w, http.StatusUnauthorized, "this staff account is not assigned to the selected role")
			return
		}
		token, err := auth.IssueToken(cfg, member.ID, member.Email, member.Role, "staff")
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not create auth token")
			return
		}
		if err := notifyAdminsOfStaffLogin(db, member); err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not notify administrators of staff login")
			return
		}

		api.WriteSuccess(w, http.StatusOK, map[string]any{
			"token": token,
			"user":  member,
		})
	}
}

func notifyAdminsOfStaffLogin(db *gorm.DB, member models.Staff) error {
	var admins []models.Admin
	if err := db.Select("id").Find(&admins).Error; err != nil {
		return err
	}

	roleName := "Sales Staff"
	if member.Role == "inventory_staff" {
		roleName = "Inventory Staff"
	}
	metadata := models.NotificationMetadata{
		StaffID:    member.ID,
		StaffName:  member.Name,
		StaffEmail: member.Email,
		StaffRole:  member.Role,
	}
	if len(member.Outlets) > 0 {
		metadata.OutletID = member.Outlets[0].ID
		metadata.OutletName = member.Outlets[0].Name
	}

	title := fmt.Sprintf("%s logged in", member.Name)
	message := fmt.Sprintf("%s logged in as %s.", member.Name, roleName)
	return db.Transaction(func(tx *gorm.DB) error {
		for _, admin := range admins {
			if _, err := notifications.CreateWithMetadata(tx, admin.ID, "admin", "staff_login", title, message, "/staff", metadata); err != nil {
				return err
			}
		}
		return nil
	})
}
