package orders

import (
	"net/http"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"
	"avinsmart/backend/internal/pricing"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type quoteRequest struct {
	Items     []itemRequest `json:"items"`
	PriceTier string        `json:"price_tier"`
}

func Quote(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload quoteRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if payload.PriceTier == "" {
			payload.PriceTier = "retail"
		}
		products := make(map[uint]models.Product, len(payload.Items))
		items := make([]pricing.Item, 0, len(payload.Items))
		for _, item := range payload.Items {
			var product models.Product
			if item.ProductID == 0 {
				api.WriteError(w, http.StatusBadRequest, "product_id must be positive")
				return
			}
			if err := db.First(&product, item.ProductID).Error; err != nil {
				api.WriteError(w, http.StatusBadRequest, "product not found")
				return
			}
			products[product.ID] = product
			id := product.ID
			items = append(items, pricing.Item{ProductID: &id, Quantity: item.Quantity})
		}
		quote, err := pricing.Build(products, items, payload.PriceTier, decimal.Zero, money.Zero())
		if err != nil {
			api.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		api.WriteSuccess(w, http.StatusOK, quote)
	}
}
