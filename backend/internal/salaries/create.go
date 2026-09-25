package salaries

import (
	"errors"
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var errPaidSalary = errors.New("paid salary records cannot be edited")

type salaryRequest struct {
	StaffID   uint         `json:"staff_id"`
	Amount    money.Amount `json:"amount"`
	Currency  string       `json:"currency"`
	PayPeriod string       `json:"pay_period"`
}

func (p *salaryRequest) validate() api.Fields {
	fields := api.NewFields()
	p.Currency = strings.ToUpper(strings.TrimSpace(p.Currency))
	p.PayPeriod = strings.TrimSpace(p.PayPeriod)
	if p.StaffID == 0 {
		fields.Add("staff_id", "staff_id is required")
	}
	if p.Amount.IsZero() || p.Amount.IsNegative() {
		fields.Add("amount", "amount must be greater than zero and use at most two decimals")
	}
	if !validCurrency(p.Currency) {
		fields.Add("currency", currencyError())
	}
	if err := validatePayPeriod(p.PayPeriod); err != nil {
		fields.Add("pay_period", err.Error())
	}
	return fields
}

func Create(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := principal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var payload salaryRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body; amount must be a decimal string")
			return
		}
		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}
		member, err := authorizeStaff(db, actor, payload.StaffID)
		if err != nil {
			writeStaffAccessError(w, err)
			return
		}
		if err := ensurePeriodCurrency(db, payload.PayPeriod, payload.Currency, 0); err != nil {
			api.WriteError(w, http.StatusConflict, err.Error())
			return
		}

		record := models.Salary{StaffID: member.ID, Amount: payload.Amount, Currency: payload.Currency, PayPeriod: payload.PayPeriod, Status: "pending"}
		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&record).Error; err != nil {
				return err
			}
			return recordAudit(tx, "salary", record.ID, "created", actor.UserID, nil, record)
		})
		if err != nil {
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

func Update(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := principal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var payload salaryRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body; amount must be a decimal string")
			return
		}
		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
			return
		}

		var record models.Salary
		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&record, chi.URLParam(r, "id")).Error; err != nil {
				return err
			}
			if record.Status == "paid" {
				return errPaidSalary
			}
			if _, err := authorizeStaff(tx, actor, record.StaffID); err != nil {
				return err
			}
			if _, err := authorizeStaff(tx, actor, payload.StaffID); err != nil {
				return err
			}
			if err := ensurePeriodCurrency(tx, payload.PayPeriod, payload.Currency, record.ID); err != nil {
				return err
			}
			before := record
			record.StaffID, record.Amount, record.Currency, record.PayPeriod = payload.StaffID, payload.Amount, payload.Currency, payload.PayPeriod
			if err := tx.Save(&record).Error; err != nil {
				return err
			}
			return recordAudit(tx, "salary", record.ID, "updated", actor.UserID, before, record)
		})
		if err != nil {
			switch {
			case errors.Is(err, gorm.ErrRecordNotFound):
				api.WriteError(w, http.StatusNotFound, "salary record not found")
			case errors.Is(err, errPaidSalary):
				api.WriteError(w, http.StatusConflict, errPaidSalary.Error())
			case api.IsUniqueViolation(err):
				api.WriteError(w, http.StatusConflict, "salary already exists for this staff member and pay period")
			case strings.HasPrefix(err.Error(), "all salary records"):
				api.WriteError(w, http.StatusConflict, err.Error())
			default:
				writeStaffAccessError(w, err)
			}
			return
		}
		db.Preload("Staff").First(&record, record.ID)
		api.WriteSuccess(w, http.StatusOK, record)
	}
}
