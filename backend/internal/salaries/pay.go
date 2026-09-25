package salaries

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type paymentRequest struct {
	Amount    money.Amount `json:"amount"`
	Method    string       `json:"method"`
	Reference string       `json:"reference"`
}

func MarkPaid(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := principal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var payload paymentRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body; amount must be a decimal string")
			return
		}
		payload.Method = strings.ToLower(strings.TrimSpace(payload.Method))
		if payload.Method == "" {
			payload.Method = "bank_transfer"
		}
		if payload.Method != "cash" && payload.Method != "bank_transfer" && payload.Method != "upi" {
			api.WriteError(w, http.StatusBadRequest, "method must be cash, bank_transfer, or upi")
			return
		}

		var record models.Salary
		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&record, chi.URLParam(r, "id")).Error; err != nil {
				return err
			}
			if _, err := authorizeStaff(tx, actor, record.StaffID); err != nil {
				return err
			}
			if record.Status == "paid" {
				return gorm.ErrDuplicatedKey
			}
			amount := payload.Amount
			if amount.IsZero() {
				amount = record.Amount
			}
			if amount.IsNegative() || amount.IsZero() || amount.String() != record.Amount.String() {
				return errors.New("payment amount must exactly match the salary amount")
			}
			before := record
			now := time.Now().UTC()
			record.Status, record.PaidAt, record.PaidAmount = "paid", &now, amount
			record.PaymentMethod, record.PaymentReference, record.PaidByID = payload.Method, strings.TrimSpace(payload.Reference), &actor.UserID
			if err := tx.Save(&record).Error; err != nil {
				return err
			}
			return recordAudit(tx, "salary", record.ID, "paid", actor.UserID, before, record)
		})
		if err != nil {
			switch {
			case errors.Is(err, gorm.ErrRecordNotFound):
				api.WriteError(w, http.StatusNotFound, "salary record not found")
			case errors.Is(err, gorm.ErrDuplicatedKey):
				api.WriteError(w, http.StatusConflict, "salary is already paid")
			case strings.Contains(err.Error(), "payment amount"):
				api.WriteError(w, http.StatusBadRequest, err.Error())
			default:
				writeStaffAccessError(w, err)
			}
			return
		}
		db.Preload("Staff").First(&record, record.ID)
		api.WriteSuccess(w, http.StatusOK, record)
	}
}
