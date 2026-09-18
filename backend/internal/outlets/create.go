package outlets

import (
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

var validStatuses = map[string]bool{
	"active":   true,
	"inactive": true,
	"locked":   true,
}

type createOutletRequest struct {
	Name          string `json:"name"`
	Location      string `json:"location"`
	ContactPerson string `json:"contact_person"`
	Phone         string `json:"phone"`
	Email         string `json:"email"`
	Status        string `json:"status"`
}

func (r *createOutletRequest) validate() api.Fields {
	fields := api.Fields{}

	r.Name = strings.TrimSpace(r.Name)
	r.Status = strings.TrimSpace(r.Status)

	if r.Name == "" {
		fields.Add("name", "name is required")
	}

	if r.Status == "" {
		r.Status = "active"
	} else if !validStatuses[r.Status] {
		fields.Add("status", "status must be one of: active, inactive, locked")
	}

	return fields
}

func CreateOutlet(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload createOutletRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}

		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}

		outlet := models.Outlet{
			Name:          payload.Name,
			Location:      strings.TrimSpace(payload.Location),
			ContactPerson: strings.TrimSpace(payload.ContactPerson),
			Phone:         strings.TrimSpace(payload.Phone),
			Email:         strings.TrimSpace(payload.Email),
			Status:        payload.Status,
		}

		if outlet.Status == "locked" {
			now := time.Now()
			outlet.LockedAt = &now
		}

		if err := db.Create(&outlet).Error; err != nil {
			if api.IsUniqueViolation(err) {
				api.WriteError(w, http.StatusConflict, "outlet name already exists")
				return
			}

			api.WriteError(w, http.StatusInternalServerError, "could not create outlet")
			return
		}

		api.WriteSuccess(w, http.StatusCreated, outlet)
	}
}
