package products

import (
	"net/http"
	"strconv"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/inventory"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type priceUpdateRequest struct {
	Quantity             *int         `json:"quantity"`
	RetailPrice          money.Amount `json:"retail_price"`
	CustomerDisplayPrice money.Amount `json:"customer_display_price"`
	BoughtPrice          money.Amount `json:"bought_price"`
	WholesalePrice       money.Amount `json:"whole_sale_price"`
	AllOutlets           bool         `json:"all_outlets"`
}

func productID(r *http.Request) (uint, bool) {
	id, err := strconv.ParseUint(chi.URLParam(r, "id"), 10, 64)
	return uint(id), err == nil && id > 0
}

func UpdatePrices(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := productID(r)
		if !ok {
			api.WriteError(w, http.StatusBadRequest, "invalid product id")
			return
		}
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}

		var payload priceUpdateRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if payload.RetailPrice.IsNegative() || payload.CustomerDisplayPrice.IsNegative() || payload.BoughtPrice.IsNegative() || payload.WholesalePrice.IsNegative() {
			api.WriteError(w, http.StatusBadRequest, "prices cannot be negative")
			return
		}
		if payload.Quantity == nil || *payload.Quantity < 0 {
			api.WriteError(w, http.StatusBadRequest, "quantity must be zero or greater")
			return
		}

		var updated models.Product
		err := db.Transaction(func(tx *gorm.DB) error {
			var selected models.Product
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&selected, id).Error; err != nil {
				return err
			}
			targets := []models.Product{selected}
			if payload.AllOutlets {
				if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("sku_id = ?", selected.SKUID).Find(&targets).Error; err != nil {
					return err
				}
			}

			for _, product := range targets {
				oldQuantity := product.Quantity
				pricesChanged := !product.RetailPrice.Equal(payload.RetailPrice.Decimal) || !product.CustomerDisplayPrice.Equal(payload.CustomerDisplayPrice.Decimal) || !product.BoughtPrice.Equal(payload.BoughtPrice.Decimal) || !product.WholeSalePrice.Equal(payload.WholesalePrice.Decimal)
				quantityChanged := oldQuantity != *payload.Quantity
				history := models.ProductPriceHistory{
					ProductID: product.ID, OutletID: product.OutletID, ActorID: principal.UserID,
					OldQuantity: product.Quantity, NewQuantity: *payload.Quantity,
					OldRetailPrice: product.RetailPrice, NewRetailPrice: payload.RetailPrice,
					OldCustomerPrice: product.CustomerDisplayPrice, NewCustomerPrice: payload.CustomerDisplayPrice,
					OldBoughtPrice: product.BoughtPrice, NewBoughtPrice: payload.BoughtPrice,
					OldWholesalePrice: product.WholeSalePrice, NewWholesalePrice: payload.WholesalePrice,
				}

				if err := tx.Model(&product).Updates(map[string]any{
					"quantity":               *payload.Quantity,
					"retail_price":           payload.RetailPrice,
					"customer_display_price": payload.CustomerDisplayPrice,
					"bought_price":           payload.BoughtPrice,
					"whole_sale_price":       payload.WholesalePrice,
				}).Error; err != nil {
					return err
				}
				if err := inventory.Record(tx, product, *payload.Quantity-oldQuantity, inventory.ReasonAdjustment, &principal.UserID, "price_update", 0); err != nil {
					return err
				}
				if pricesChanged || quantityChanged {
					if err := tx.Create(&history).Error; err != nil {
						return err
					}
				}
			}
			return tx.Preload("Category").Preload("SubCategory").Preload("Outlet").First(&updated, id).Error
		})

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				api.WriteError(w, http.StatusNotFound, "product not found")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not update product prices")
			return
		}
		api.WriteSuccess(w, http.StatusOK, updated)
	}
}

func ListPriceHistory(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := productID(r)
		if !ok {
			api.WriteError(w, http.StatusBadRequest, "invalid product id")
			return
		}
		var history []models.ProductPriceHistory
		if err := db.Where("product_id = ?", id).Order("changed_at desc").Limit(50).Find(&history).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch price history")
			return
		}
		api.WriteSuccess(w, http.StatusOK, history)
	}
}

func ListRecentPriceHistory(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var records []models.ProductPriceHistory
		if err := db.Order("changed_at desc").Find(&records).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch recent price history")
			return
		}

		seen := make(map[uint]bool)
		result := make([]map[string]any, 0, 5)
		for _, record := range records {
			if seen[record.ProductID] {
				continue
			}
			seen[record.ProductID] = true

			var product models.Product
			if err := db.Preload("Outlet").First(&product, record.ProductID).Error; err != nil {
				continue
			}
			result = append(result, map[string]any{"history": record, "product": product})
			if len(result) == 5 {
				break
			}
		}
		api.WriteSuccess(w, http.StatusOK, result)
	}
}
