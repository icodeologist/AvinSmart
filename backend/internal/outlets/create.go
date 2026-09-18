package outlets

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/models"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

var validStatuses = map[string]bool{
	"active":   true,
	"inactive": true,
	"locked":   true,
}

func CreateOutlet(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input struct {
			Name          string `json:"name"`
			Location      string `json:"location"`
			ContactPerson string `json:"contact_person"`
			Phone         string `json:"phone"`
			Email         string `json:"email"`
			Status        string `json:"status"`
		}

		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "invalid request body",
			})
			return
		}

		input.Name = strings.TrimSpace(input.Name)
		input.Status = strings.TrimSpace(input.Status)

		if input.Name == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "name is required",
			})
			return
		}

		if input.Status == "" {
			input.Status = "active"
		}

		if !validStatuses[input.Status] {
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": "status must be one of: active, inactive, locked",
			})
			return
		}

		outlet := models.Outlet{
			Name:          input.Name,
			Location:      strings.TrimSpace(input.Location),
			ContactPerson: strings.TrimSpace(input.ContactPerson),
			Phone:         strings.TrimSpace(input.Phone),
			Email:         strings.TrimSpace(input.Email),
			Status:        input.Status,
		}

		if outlet.Status == "locked" {
			now := time.Now()
			outlet.LockedAt = &now
		}

		if err := db.Create(&outlet).Error; err != nil {
			if isUniqueViolation(err) {
				writeJSON(w, http.StatusConflict, map[string]string{
					"error": "outlet name already exists",
				})
				return
			}

			writeJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "could not create outlet",
			})
			return
		}

		writeJSON(w, http.StatusCreated, outlet)
	}
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
