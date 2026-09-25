package orders

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/outletaccess"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const pendingOrderLifetime = 30 * time.Minute

var (
	ErrOrderPaid    = errors.New("paid orders cannot be cancelled")
	ErrOrderExpired = errors.New("order has expired")
)

func Cancel(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}

		var order models.Order
		err := db.Transaction(func(tx *gorm.DB) error {
			var err error
			order, err = lockOrder(tx, chi.URLParam(r, "id"))
			if err != nil {
				return err
			}
			allowed, err := outletaccess.CanAccess(tx, principal, order.OutletID)
			if err != nil {
				return err
			}
			if !allowed {
				return outletaccess.ErrOutletForbidden
			}
			return cancelPendingOrder(tx, &order, "cancelled", time.Now())
		})
		if err != nil {
			writeCancellationError(w, err)
			return
		}
		api.WriteSuccess(w, http.StatusOK, order)
	}
}

func lockOrder(tx *gorm.DB, id string) (models.Order, error) {
	var order models.Order
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, id).Error; err != nil {
		return models.Order{}, err
	}
	return order, nil
}

func cancelPendingOrder(tx *gorm.DB, order *models.Order, status string, now time.Time) error {
	switch order.Status {
	case "paid":
		return ErrOrderPaid
	case "cancelled", "expired":
		return nil
	case "pending":
		// Continue below.
	default:
		return fmt.Errorf("order cannot be cancelled from status %q", order.Status)
	}

	if err := releaseReservedStock(tx, order.ID); err != nil {
		return err
	}
	order.Status = status
	order.CancelledAt = &now
	return tx.Save(order).Error
}

func releaseReservedStock(tx *gorm.DB, orderID uint) error {
	var items []models.OrderItem
	if err := tx.Where("order_id = ?", orderID).Find(&items).Error; err != nil {
		return err
	}
	sort.Slice(items, func(i, j int) bool { return items[i].ProductID < items[j].ProductID })
	for _, item := range items {
		var product models.Product
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&product, item.ProductID).Error; err != nil {
			return err
		}
		if err := tx.Model(&product).UpdateColumn("quantity", gorm.Expr("quantity + ?", item.Quantity)).Error; err != nil {
			return err
		}
	}
	return nil
}

func expirePendingOrder(tx *gorm.DB, order *models.Order, now time.Time) error {
	if order.Status != "pending" || order.ExpiresAt == nil || order.ExpiresAt.After(now) {
		return nil
	}
	return cancelPendingOrder(tx, order, "expired", now)
}

// ExpirePending reuses the same locked cancellation transaction as the HTTP
// endpoint. It is safe to call concurrently with payment or cancellation.
func ExpirePending(db *gorm.DB, now time.Time) (int, error) {
	var ids []uint
	if err := db.Model(&models.Order{}).
		Where("status = ? AND expires_at IS NOT NULL AND expires_at <= ?", "pending", now).
		Pluck("id", &ids).Error; err != nil {
		return 0, err
	}

	expired := 0
	for _, id := range ids {
		err := db.Transaction(func(tx *gorm.DB) error {
			order, err := lockOrder(tx, fmt.Sprint(id))
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return nil
				}
				return err
			}
			if err := expirePendingOrder(tx, &order, now); err != nil {
				return err
			}
			if order.Status == "expired" {
				expired++
			}
			return nil
		})
		if err != nil {
			return expired, err
		}
	}
	return expired, nil
}

func StartExpiryWorker(ctx context.Context, db *gorm.DB) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	_, _ = ExpirePending(db, time.Now())
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			_, _ = ExpirePending(db, now)
		}
	}
}

func writeCancellationError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		api.WriteError(w, http.StatusNotFound, "order not found")
	case errors.Is(err, outletaccess.ErrOutletForbidden):
		api.WriteError(w, http.StatusNotFound, "order not found")
	case errors.Is(err, ErrOrderPaid):
		api.WriteError(w, http.StatusConflict, err.Error())
	default:
		api.WriteError(w, http.StatusBadRequest, err.Error())
	}
}
