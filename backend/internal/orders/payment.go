package orders

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/auth"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"
	"avinsmart/backend/internal/notifications"
	"avinsmart/backend/internal/outletaccess"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type paymentRequest struct {
	Amount       money.Amount  `json:"amount"`
	Method       string        `json:"method"`
	CashTendered *money.Amount `json:"cash_tendered"`
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
		if payload.Amount.IsNegative() || payload.Amount.IsZero() {
			api.WriteError(w, http.StatusBadRequest, "amount must be greater than zero")
			return
		}
		if payload.Method == "" {
			api.WriteError(w, http.StatusBadRequest, "method is required")
			return
		}
		if payload.Method == "cash" {
			if payload.CashTendered == nil {
				api.WriteError(w, http.StatusBadRequest, "cash_tendered is required for cash payments")
				return
			}
			if payload.CashTendered.IsNegative() || payload.CashTendered.LessThan(payload.Amount) {
				api.WriteError(w, http.StatusBadRequest, "cash_tendered must be at least the payment amount")
				return
			}
		} else if payload.CashTendered != nil && !payload.CashTendered.IsZero() {
			api.WriteError(w, http.StatusBadRequest, "cash_tendered is only valid for cash payments")
			return
		}
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}

		var payment models.Payment
		var updatedOrder models.Order
		err := db.Transaction(func(tx *gorm.DB) error {
			var order models.Order
			// This is the important part: lock before reading AmountDue.
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, chi.URLParam(r, "id")).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					return gorm.ErrRecordNotFound
				}
				return err
			}
			allowed, err := outletaccess.CanAccess(tx, principal, order.OutletID)
			if err != nil {
				return err
			}
			if !allowed {
				return outletaccess.ErrOutletForbidden
			}
			if err := expirePendingOrder(tx, &order, time.Now()); err != nil {
				return err
			}
			if order.Status == "expired" {
				updatedOrder = order
				return nil
			}
			if order.Status == "paid" || order.AmountDue.IsZero() {
				return fmt.Errorf("order is already paid")
			}
			if payload.Amount.GreaterThan(order.AmountDue) {
				return fmt.Errorf("payment exceeds amount due of %s", order.AmountDue.String())
			}
			cashTendered := money.Zero()
			changeGiven := money.Zero()
			if payload.CashTendered != nil {
				cashTendered = *payload.CashTendered
				changeGiven = cashTendered.Sub(payload.Amount)
			}
			payment = models.Payment{OrderID: order.ID, OutletID: order.OutletID, Amount: payload.Amount, Method: payload.Method, CashTendered: cashTendered, ChangeGiven: changeGiven}
			order.AmountPaid = order.AmountPaid.Add(payload.Amount)
			order.AmountDue = order.Total.Sub(order.AmountPaid)
			if order.AmountDue.IsZero() {
				order.AmountDue = money.Zero()
				order.Status = "paid"
			}
			if err := tx.Create(&payment).Error; err != nil {
				return err
			}
			if err := tx.Save(&order).Error; err != nil {
				return err
			}
			if order.Status == "paid" {
				if err := notifyAdminsOfCompletedOrder(tx, principal, order, payment); err != nil {
					return err
				}
			}
			updatedOrder = order
			return nil
		})
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				api.WriteError(w, http.StatusNotFound, "order not found")
				return
			}
			if errors.Is(err, outletaccess.ErrOutletForbidden) {
				api.WriteError(w, http.StatusNotFound, "order not found")
				return
			}
			api.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		if updatedOrder.Status == "expired" {
			api.WriteError(w, http.StatusConflict, ErrOrderExpired.Error())
			return
		}
		api.WriteSuccess(w, http.StatusCreated, map[string]any{
			"payment": payment,
			"order":   updatedOrder,
		})
	}
}

func notifyAdminsOfCompletedOrder(tx *gorm.DB, principal auth.Principal, order models.Order, payment models.Payment) error {
	staffName := principal.Email
	staffEmail := principal.Email
	staffID := principal.UserID

	if principal.UserType == "staff" {
		var staff models.Staff
		if err := tx.Select("id", "name", "email").First(&staff, principal.UserID).Error; err != nil {
			return err
		}
		staffName = staff.Name
		staffEmail = staff.Email
	} else if principal.UserType == "admin" {
		var admin models.Admin
		if err := tx.Select("id", "username", "email").First(&admin, principal.UserID).Error; err != nil {
			return err
		}
		staffName = admin.Username
		staffEmail = admin.Email
	}

	var outlet models.Outlet
	if err := tx.Select("id", "name").First(&outlet, order.OutletID).Error; err != nil {
		return err
	}
	var admins []models.Admin
	if err := tx.Select("id").Find(&admins).Error; err != nil {
		return err
	}

	metadata := models.NotificationMetadata{
		OrderID:       order.ID,
		OrderNumber:   order.OrderNumber,
		OutletID:      outlet.ID,
		OutletName:    outlet.Name,
		StaffID:       staffID,
		StaffName:     staffName,
		StaffEmail:    staffEmail,
		CustomerID:    nil,
		CustomerName:  "",
		Total:         order.Total.String(),
		PaymentMethod: payment.Method,
	}
	title := fmt.Sprintf("Order %s completed", order.OrderNumber)
	message := fmt.Sprintf("%s completed a sale for ₹%s. Customer: not captured.", staffName, order.Total.String())
	for _, admin := range admins {
		if _, err := notifications.CreateWithMetadata(tx, admin.ID, "admin", "sale_completed", title, message, "/notifications", metadata); err != nil {
			return err
		}
	}
	return nil
}
