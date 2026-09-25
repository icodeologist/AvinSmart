package orders

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/inventory"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"
	"avinsmart/backend/internal/outletaccess"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type refundRequest struct {
	Reason string `json:"reason"`
}

func RefundPayment(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var payload refundRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		payload.Reason = strings.TrimSpace(payload.Reason)
		if payload.Reason == "" {
			api.WriteError(w, http.StatusBadRequest, "reason is required")
			return
		}

		var payment models.Payment
		var order models.Order
		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&payment, chi.URLParam(r, "payment_id")).Error; err != nil {
				return err
			}
			if payment.OrderID == 0 || payment.OrderID != parseUintParam(r, "id") {
				return gorm.ErrRecordNotFound
			}
			if payment.RefundedAt != nil {
				return errors.New("payment has already been refunded")
			}
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, payment.OrderID).Error; err != nil {
				return err
			}
			allowed, err := outletaccess.CanAccess(tx, principal, order.OutletID)
			if err != nil {
				return err
			}
			if !allowed {
				return outletaccess.ErrOutletForbidden
			}

			now := time.Now()
			payment.RefundedAt = &now
			payment.RefundedBy = &principal.UserID
			payment.RefundReason = payload.Reason
			if err := tx.Save(&payment).Error; err != nil {
				return err
			}

			order.AmountPaid = order.AmountPaid.Sub(payment.Amount)
			if order.AmountPaid.IsNegative() {
				return errors.New("refunded payments exceed amount paid")
			}
			var activePayments int64
			if err := tx.Model(&models.Payment{}).Where("order_id = ? AND refunded_at IS NULL", order.ID).Count(&activePayments).Error; err != nil {
				return err
			}
			if activePayments == 0 {
				if order.StockReleasedAt == nil {
					if err := releaseReservedStock(tx, order.ID, inventory.ReasonRefund, &principal.UserID); err != nil {
						return err
					}
					order.StockReleasedAt = &now
				}
				order.AmountPaid = money.Zero()
				order.AmountDue = money.Zero()
				order.Status = "refunded"
			} else {
				order.AmountDue = order.Total.Sub(order.AmountPaid)
				order.Status = "pending"
			}
			return tx.Save(&order).Error
		})
		if err != nil {
			switch {
			case errors.Is(err, gorm.ErrRecordNotFound), errors.Is(err, outletaccess.ErrOutletForbidden):
				api.WriteError(w, http.StatusNotFound, "payment not found")
			case strings.Contains(err.Error(), "already been refunded"):
				api.WriteError(w, http.StatusConflict, err.Error())
			default:
				api.WriteError(w, http.StatusBadRequest, err.Error())
			}
			return
		}
		api.WriteSuccess(w, http.StatusOK, map[string]any{"payment": payment, "order": order})
	}
}

func parseUintParam(r *http.Request, name string) uint {
	value, _ := strconv.ParseUint(chi.URLParam(r, name), 10, 32)
	return uint(value)
}
