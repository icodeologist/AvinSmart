package orders

import (
	"net/http"
	"strconv"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"
	"avinsmart/backend/internal/outletaccess"

	"gorm.io/gorm"
)

type SalesReport struct {
	Orders       []models.Order `json:"orders"`
	GrossSales   money.Amount   `json:"gross_sales"`
	Payments     money.Amount   `json:"payments"`
	Refunds      money.Amount   `json:"refunds"`
	NetCollected money.Amount   `json:"net_collected"`
	CashTendered money.Amount   `json:"cash_tendered"`
	ChangeGiven  money.Amount   `json:"change_given"`
}

func List(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		query, err := outletaccess.WhereAllowed(db, principal, db.Preload("Items").Preload("Payments").Preload("Outlet"), "orders.outlet_id")
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not check outlet access")
			return
		}
		if rawOutletID := r.URL.Query().Get("outlet_id"); rawOutletID != "" {
			outletID, parseErr := strconv.ParseUint(rawOutletID, 10, 32)
			if parseErr != nil || outletID == 0 {
				api.WriteError(w, http.StatusBadRequest, "outlet_id must be a positive integer")
				return
			}
			allowed, accessErr := outletaccess.CanAccess(db, principal, uint(outletID))
			if accessErr != nil {
				api.WriteError(w, http.StatusInternalServerError, "could not check outlet access")
				return
			}
			if !allowed {
				api.WriteError(w, http.StatusForbidden, "you do not have access to this outlet")
				return
			}
			query = query.Where("orders.outlet_id = ?", outletID)
		}

		var orders []models.Order
		if err := query.Order("orders.created_at desc").Find(&orders).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch orders")
			return
		}

		report := SalesReport{Orders: orders}
		for _, order := range orders {
			if order.Status == "paid" || order.Status == "refunded" {
				report.GrossSales = report.GrossSales.Add(order.Total)
			}
			for _, payment := range order.Payments {
				if payment.RefundedAt != nil {
					report.Refunds = report.Refunds.Add(payment.Amount)
					continue
				}
				report.Payments = report.Payments.Add(payment.Amount)
				report.CashTendered = report.CashTendered.Add(payment.CashTendered)
				report.ChangeGiven = report.ChangeGiven.Add(payment.ChangeGiven)
			}
		}
		report.NetCollected = report.Payments.Sub(report.Refunds)
		api.WriteSuccess(w, http.StatusOK, report)
	}
}
