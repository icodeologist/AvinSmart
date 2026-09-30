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
			} else {
				expected, err := payableSalaryForRecord(tx, record)
				if err != nil {
					return err
				}
				if expected.IsZero() || amount.IsNegative() || amount.String() != expected.String() {
					return errors.New("payment amount must exactly match the calculated payable salary")
				}
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

// payableSalaryForRecord is the payment-time counterpart to the payroll
// summary. It prevents a client from paying an amount different from the
// attendance- and leave-based calculation for the salary's pay period.
func payableSalaryForRecord(db *gorm.DB, record models.Salary) (money.Amount, error) {
	calendar, err := getCalendar(db, record.PayPeriod)
	if err != nil {
		return money.Zero(), err
	}
	start, end := record.PayPeriod+"-01", nextMonth(record.PayPeriod)
	var presentDays, paidLeaveDays int64
	if err := db.Model(&models.Attendance{}).Where("staff_id = ? AND date >= ? AND date < ? AND status = ?", record.StaffID, start, end, "present").Count(&presentDays).Error; err != nil {
		return money.Zero(), err
	}
	if err := db.Model(&models.LeaveRequest{}).Where("staff_id = ? AND date >= ? AND date < ? AND status = ?", record.StaffID, start, end, "approved").Count(&paidLeaveDays).Error; err != nil {
		return money.Zero(), err
	}
	return payableAmount(record.Amount, int(presentDays+paidLeaveDays), calendar.WorkingDays), nil
}
