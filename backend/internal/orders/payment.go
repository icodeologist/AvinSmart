package orders

import (
	"fmt"
	"math"
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type paymentRequest struct {
	Amount float64 `json:"amount"`
	Method string  `json:"method"`
}

// RecordPayment uses a database row lock because AmountDue is shared state.
// Without the lock, two cashiers can both read the same old balance, both
// accept a payment, and make AmountPaid larger than the order total.
//
// FOR UPDATE locks this order until the surrounding transaction commits. A
// second payment waits, then reads the newly updated AmountDue and can only
// apply money that is still outstanding.
func RecordPayment(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload paymentRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		payload.Method = strings.TrimSpace(strings.ToLower(payload.Method))
		if payload.Amount <= 0 || math.IsNaN(payload.Amount) || math.IsInf(payload.Amount, 0) {
			api.WriteError(w, http.StatusBadRequest, "amount must be greater than zero")
			return
		}
		if payload.Method == "" {
			api.WriteError(w, http.StatusBadRequest, "method is required")
			return
		}

		var payment models.Payment
		err := db.Transaction(func(tx *gorm.DB) error {
			var order models.Order
			// This is the important part: lock before reading AmountDue.
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, chi.URLParam(r, "id")).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					return gorm.ErrRecordNotFound
				}
				return err
			}
			if order.Status == "paid" || order.AmountDue <= 0.009 {
				return fmt.Errorf("order is already paid")
			}
			if payload.Amount > order.AmountDue+0.009 {
				return fmt.Errorf("payment exceeds amount due of %.2f", order.AmountDue)
			}
			payment = models.Payment{OrderID: order.ID, Amount: payload.Amount, Method: payload.Method}
			order.AmountPaid += payload.Amount
			order.AmountDue = order.Total - order.AmountPaid
			if order.AmountDue <= 0.009 {
				order.AmountDue = 0
				order.Status = "paid"
			}
			if err := tx.Create(&payment).Error; err != nil {
				return err
			}
			return tx.Save(&order).Error
		})
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				api.WriteError(w, http.StatusNotFound, "order not found")
				return
			}
			api.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		api.WriteSuccess(w, http.StatusCreated, payment)
	}
}
