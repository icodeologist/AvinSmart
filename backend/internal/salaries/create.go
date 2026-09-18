package salaries

import (
	"errors"
	"net/http"
	"regexp"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

var payPeriodPattern = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)

type createRequest struct {
	StaffID   uint    `json:"staff_id"`
	Amount    float64 `json:"amount"`
	Currency  string  `json:"currency"`
	PayPeriod string  `json:"pay_period"`
}

func (r *createRequest) validate() api.Fields {
	fields := api.NewFields()
	r.Currency = strings.ToUpper(strings.TrimSpace(r.Currency))
	r.PayPeriod = strings.TrimSpace(r.PayPeriod)
	if r.StaffID == 0 {
		fields.Add("staff_id", "staff_id is required")
	}
	if r.Amount <= 0 {
		fields.Add("amount", "amount must be greater than zero")
	}
	if r.Currency == "" {
		r.Currency = "USD"
	} else if len(r.Currency) != 3 {
		fields.Add("currency", "currency must be a 3-letter code")
	}
	if !payPeriodPattern.MatchString(r.PayPeriod) {
		fields.Add("pay_period", "pay_period must use YYYY-MM format")
	}
	return fields
}

func Create(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload createRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}

		var member models.Staff
		if err := db.First(&member, payload.StaffID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				api.WriteError(w, http.StatusNotFound, "staff member not found")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not find staff member")
			return
		}

		record := models.Salary{
			StaffID:   member.ID,
			Amount:    payload.Amount,
			Currency:  payload.Currency,
			PayPeriod: payload.PayPeriod,
			Status:    "pending",
		}
		if err := db.Create(&record).Error; err != nil {
			if api.IsUniqueViolation(err) {
				api.WriteError(w, http.StatusConflict, "salary already exists for this staff member and pay period")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not create salary record")
			return
		}

		db.Preload("Staff").First(&record, record.ID)
		api.WriteSuccess(w, http.StatusCreated, record)
	}
}
