package orders

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type itemRequest struct {
	ProductID uint `json:"product_id"`
	Quantity  int  `json:"quantity"`
}

type createRequest struct {
	OrderNumber string        `json:"order_number"`
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

		order := models.Order{OrderNumber: payload.OrderNumber, Status: "pending", PriceTier: payload.PriceTier, Cashier: strings.TrimSpace(payload.Cashier)}
		err := db.Transaction(func(tx *gorm.DB) error {
			for _, item := range payload.Items {
				if item.ProductID == 0 || item.Quantity <= 0 {
					return fmt.Errorf("product_id and quantity must be positive")
				}
				var product models.Product
				if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&product, item.ProductID).Error; err != nil {
					return fmt.Errorf("product %d not found", item.ProductID)
				}
				if product.Quantity < item.Quantity {
					return fmt.Errorf("insufficient stock for %s: %d requested, %d available", product.Title, item.Quantity, product.Quantity)
				}
				price := priceForTier(product, payload.PriceTier)
				line := models.OrderItem{ProductID: product.ID, Title: product.Title, Quantity: item.Quantity, UnitPrice: price, Amount: price * float64(item.Quantity)}
				order.Items = append(order.Items, line)
				order.Total += line.Amount
				if err := tx.Model(&product).Update("quantity", gorm.Expr("quantity - ?", item.Quantity)).Error; err != nil {
					return err
				}
			}
			order.AmountDue = order.Total
			return tx.Create(&order).Error
		})
		if err != nil {
			api.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		api.WriteSuccess(w, http.StatusCreated, order)
	}
}

func priceForTier(product models.Product, tier string) float64 {
	switch tier {
	case "customer_display":
		return product.CustomerDisplayPrice
	case "wholesale":
		return product.WholeSalePrice
	default:
		return product.RetailPrice
	}
}

func Get(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var order models.Order
		if err := db.Preload("Items").Preload("Payments").First(&order, chi.URLParam(r, "id")).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				api.WriteError(w, http.StatusNotFound, "order not found")
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not fetch order")
			return
		}
		api.WriteSuccess(w, http.StatusOK, order)
	}
}
