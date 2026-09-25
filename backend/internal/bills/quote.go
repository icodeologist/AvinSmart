package bills

import (
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/outletaccess"
	"avinsmart/backend/internal/pricing"

	"gorm.io/gorm"
)

func Quote(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload createBillRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if payload.PriceTier == "" {
			payload.PriceTier = defaultPriceTier
		}
		principal, authenticated := middleware.PrincipalFromContext(r.Context())
		var outletID uint
		if !authenticated {
			// Keep the pure pricing unit test usable without a database. The
			// mounted HTTP route always applies RequireAuth before this handler.
			if db != nil {
				api.WriteError(w, http.StatusUnauthorized, "authentication is required")
				return
			}
		} else {
			var err error
			outletID, err = outletaccess.Resolve(db, principal, payload.OutletID)
			if err != nil {
				writeOutletError(w, err)
				return
			}
		}
		products := make(map[uint]models.Product, len(payload.Items))
		items := make([]pricing.Item, 0, len(payload.Items))
		for _, item := range payload.Items {
			if item.Quantity <= 0 {
				api.WriteError(w, http.StatusBadRequest, "quantity must be greater than zero")
				return
			}
			var product *models.Product
			if item.ProductID != nil && *item.ProductID != 0 {
				loaded := &models.Product{}
				if err := db.Where("id = ? AND outlet_id = ?", *item.ProductID, outletID).First(loaded).Error; err != nil {
					api.WriteError(w, http.StatusBadRequest, "product not found")
					return
				}
				products[loaded.ID] = *loaded
				product = loaded
			}
			line := pricing.Item{ProductID: item.ProductID, Title: strings.TrimSpace(item.Name), Quantity: item.Quantity, Unit: item.Unit, UnitPrice: item.UnitPrice, RetailPrice: item.RetailPrice, CustomerDisplayPrice: item.CustomerDisplayPrice, BoughtPrice: item.BoughtPrice, WholesalePrice: item.WholeSalePrice}
			if product != nil {
				line.Title, line.Unit = product.Title, product.Unit
			}
			items = append(items, line)
		}
		quote, err := pricing.Build(products, items, payload.PriceTier, payload.TaxRate, payload.Discount)
		if err != nil {
			api.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		api.WriteSuccess(w, http.StatusOK, quote)
	}
}
