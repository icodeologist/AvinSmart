package dashboard

import (
	"net/http"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type Summary struct {
	TodaySales        money.Amount `json:"today_sales"`
	GrossProfit       money.Amount `json:"gross_profit"`
	BillsToday        int          `json:"bills_today"`
	PendingCollection money.Amount `json:"pending_collection"`
	InventoryCost     money.Amount `json:"inventory_cost"`
	ShelfRetailValue  money.Amount `json:"shelf_retail_value"`
	ExpectedMargin    money.Amount `json:"expected_margin"`
	AverageBill       money.Amount `json:"average_bill"`
}

type TotalInvested struct {
	TotalInvested money.Amount `json:"total_invested"`
}

func stockValues(db *gorm.DB) (inventoryCost money.Amount, shelfRetailValue money.Amount, expectedMargin money.Amount, err error) {
	var products []models.Product
	if err = db.Select("quantity", "bought_price", "retail_price").Find(&products).Error; err != nil {
		return money.Zero(), money.Zero(), money.Zero(), err
	}

	inventoryCost = money.Zero()
	shelfRetailValue = money.Zero()
	expectedMargin = money.Zero()
	for _, product := range products {
		quantity := max(product.Quantity, 0)
		inventoryCost = inventoryCost.Add(product.BoughtPrice.Multiply(quantity))
		shelfRetailValue = shelfRetailValue.Add(product.RetailPrice.Multiply(quantity))
		expectedMargin = expectedMargin.Add(product.RetailPrice.Sub(product.BoughtPrice).Multiply(quantity))
	}
	return inventoryCost, shelfRetailValue, expectedMargin, nil
}

// TotalInvestedHandler returns the current cost tied up in inventory. It uses
// every product's current on-hand quantity and bought price; products with a
// negative quantity do not reduce the investment total.
func TotalInvestedHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		inventoryCost, _, _, err := stockValues(db)
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not calculate total invested")
			return
		}
		api.WriteSuccess(w, http.StatusOK, TotalInvested{TotalInvested: inventoryCost})
	}
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

		summary := Summary{TodaySales: money.Zero(), GrossProfit: money.Zero(), PendingCollection: money.Zero(), InventoryCost: money.Zero(), ShelfRetailValue: money.Zero(), ExpectedMargin: money.Zero(), AverageBill: money.Zero()}
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

		inventoryCost, shelfRetailValue, expectedMargin, err := stockValues(db)
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not calculate stock values")
			return
		}
		summary.InventoryCost = inventoryCost
		summary.ShelfRetailValue = shelfRetailValue
		summary.ExpectedMargin = expectedMargin
		if summary.BillsToday > 0 {
			average, err := money.FromDecimal(summary.TodaySales.Decimal.Div(decimal.NewFromInt(int64(summary.BillsToday))).Round(2))
			if err != nil {
				api.WriteError(w, http.StatusInternalServerError, "could not calculate average bill")
				return
			}
			summary.AverageBill = average
		}

		api.WriteSuccess(w, http.StatusOK, summary)
	}
}
