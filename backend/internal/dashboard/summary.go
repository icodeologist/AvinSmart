package dashboard

import (
	"net/http"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"

	"gorm.io/gorm"
)

type Summary struct {
	TodaySales        money.Amount `json:"today_sales"`
	GrossProfit       money.Amount `json:"gross_profit"`
	BillsToday        int          `json:"bills_today"`
	PendingCollection money.Amount `json:"pending_collection"`
}

// Summary returns operational figures from canonical POS orders. Sales and
// profit only include fully paid orders; pending collection includes all open
// pending orders that still have an amount due.
func SummaryHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		now := time.Now()
		startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

		var paidOrders []models.Order
		if err := db.Preload("Items").Where("status = ? AND created_at >= ?", "paid", startOfDay).Find(&paidOrders).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not calculate dashboard summary")
			return
		}

		summary := Summary{TodaySales: money.Zero(), GrossProfit: money.Zero(), PendingCollection: money.Zero()}
		for _, order := range paidOrders {
			summary.BillsToday++
			summary.TodaySales = summary.TodaySales.Add(order.Total)
			for _, item := range order.Items {
				summary.GrossProfit = summary.GrossProfit.Add(item.UnitPrice.Sub(item.BoughtPrice).Multiply(item.Quantity))
			}
		}

		var pendingOrders []models.Order
		if err := db.Select("amount_due").Where("status = ?", "pending").Find(&pendingOrders).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not calculate pending collection")
			return
		}
		for _, order := range pendingOrders {
			summary.PendingCollection = summary.PendingCollection.Add(order.AmountDue)
		}

		api.WriteSuccess(w, http.StatusOK, summary)
	}
}
