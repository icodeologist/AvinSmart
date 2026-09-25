package orders

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"
	"avinsmart/backend/internal/outletaccess"
	"avinsmart/backend/internal/pricing"

	"github.com/go-chi/chi/v5"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type itemRequest struct {
	ProductID uint `json:"product_id"`
	Quantity  int  `json:"quantity"`
}

type createRequest struct {
	OrderNumber string        `json:"order_number"`
	OutletID    *uint         `json:"outlet_id"`
	PriceTier   string        `json:"price_tier"`
	Cashier     string        `json:"cashier"`
	Items       []itemRequest `json:"items"`
}

func Create(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload createRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		payload.PriceTier = strings.TrimSpace(payload.PriceTier)
		if payload.PriceTier == "" {
			payload.PriceTier = "retail"
		}
		if payload.OrderNumber == "" {
			payload.OrderNumber = fmt.Sprintf("POS-%d", time.Now().UnixNano())
		}
		if payload.PriceTier != "retail" && payload.PriceTier != "customer_display" && payload.PriceTier != "wholesale" {
			api.WriteError(w, http.StatusBadRequest, "price_tier must be retail, customer_display, or wholesale")
			return
		}
		if len(payload.Items) == 0 {
			api.WriteError(w, http.StatusBadRequest, "at least one item is required")
			return
		}
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		outletID, err := outletaccess.Resolve(db, principal, payload.OutletID)
		if err != nil {
			writeOutletError(w, err)
			return
		}

		order := models.Order{OrderNumber: payload.OrderNumber, OutletID: outletID, Status: "pending", PriceTier: payload.PriceTier, Cashier: strings.TrimSpace(payload.Cashier)}
		err = db.Transaction(func(tx *gorm.DB) error {
			products := make(map[uint]models.Product, len(payload.Items))
			pricingItems := make([]pricing.Item, 0, len(payload.Items))
			for _, item := range payload.Items {
				if item.ProductID == 0 || item.Quantity <= 0 {
					return fmt.Errorf("product_id and quantity must be positive")
				}
				var product models.Product
				if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND outlet_id = ?", item.ProductID, outletID).First(&product).Error; err != nil {
					return fmt.Errorf("product %d not found", item.ProductID)
				}
				if product.Quantity < item.Quantity {
					return fmt.Errorf("insufficient stock for %s: %d requested, %d available", product.Title, item.Quantity, product.Quantity)
				}
				products[product.ID] = product
				productID := product.ID
				pricingItems = append(pricingItems, pricing.Item{ProductID: &productID, Quantity: item.Quantity})
				if err := tx.Model(&product).Update("quantity", gorm.Expr("quantity - ?", item.Quantity)).Error; err != nil {
					return err
				}
			}
			quote, err := pricing.Build(products, pricingItems, payload.PriceTier, decimal.Zero, money.Zero())
			if err != nil {
				return err
			}
			order.Total, order.RetailTotal = quote.Total, quote.RetailTotal
			order.CustomerDisplayTotal, order.BoughtTotal = quote.CustomerDisplayTotal, quote.BoughtTotal
			order.WholesaleTotal, order.AmountDue = quote.WholesaleTotal, quote.Total
			for _, line := range quote.Lines {
				order.Items = append(order.Items, models.OrderItem{ProductID: *line.ProductID, Title: line.Title, Quantity: line.Quantity, UnitPrice: line.UnitPrice, Amount: line.Amount, RetailPrice: line.RetailPrice, CustomerDisplayPrice: line.CustomerDisplayPrice, BoughtPrice: line.BoughtPrice, WholesalePrice: line.WholesalePrice})
			}
			return tx.Create(&order).Error
		})
		if err != nil {
			api.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		api.WriteSuccess(w, http.StatusCreated, order)
	}
}

func Get(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var order models.Order
		if err := db.Preload("Items").Preload("Payments").Preload("Outlet").First(&order, chi.URLParam(r, "id")).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				api.WriteError(w, http.StatusNotFound, "order not found")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not fetch order")
			return
		}
		allowed, err := outletaccess.CanAccess(db, principal, order.OutletID)
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not check outlet access")
			return
		}
		if !allowed {
			api.WriteError(w, http.StatusNotFound, "order not found")
			return
		}
		api.WriteSuccess(w, http.StatusOK, order)
	}
}

func writeOutletError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, outletaccess.ErrOutletRequired):
		api.WriteError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, outletaccess.ErrOutletForbidden):
		api.WriteError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, outletaccess.ErrOutletNotFound):
		api.WriteError(w, http.StatusNotFound, err.Error())
	default:
		api.WriteError(w, http.StatusBadRequest, err.Error())
	}
}
