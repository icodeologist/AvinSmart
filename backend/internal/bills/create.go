package bills

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/inventory"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"
	"avinsmart/backend/internal/outletaccess"
	"avinsmart/backend/internal/pricing"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

var validPriceTiers = map[string]bool{
	"retail":           true,
	"customer_display": true,
	"bought":           true,
	"wholesale":        true,
}

var defaultPriceTier = "retail"

type billItemRequest struct {
	ProductID *uint        `json:"product_id"`
	Name      string       `json:"name"`
	SKUID     string       `json:"sku_id"`
	Quantity  int          `json:"quantity"`
	Unit      string       `json:"unit"`
	UnitPrice money.Amount `json:"unit_price"`
	Amount    money.Amount `json:"amount"`
	// Price snapshots are kept for the record so a bill is not affected
	// when a product's prices change later.
	RetailPrice          money.Amount `json:"retail_price"`
	CustomerDisplayPrice money.Amount `json:"customer_display_price"`
	BoughtPrice          money.Amount `json:"bought_price"`
	WholeSalePrice       money.Amount `json:"whole_sale_price"`
}

type createBillRequest struct {
	BillNumber    string            `json:"bill_number"`
	OutletID      *uint             `json:"outlet_id"`
	BillDate      string            `json:"bill_date"`
	CustomerName  string            `json:"customer_name"`
	CustomerPhone string            `json:"customer_phone"`
	PaymentMethod string            `json:"payment_method"`
	Cashier       string            `json:"cashier"`
	PriceTier     string            `json:"price_tier"`
	TaxRate       decimal.Decimal   `json:"tax_rate"`
	Discount      money.Amount      `json:"discount"`
	Notes         string            `json:"notes"`
	Items         []billItemRequest `json:"items"`
}

func (r *createBillRequest) validate() api.Fields {
	fields := api.Fields{}

	r.BillNumber = strings.TrimSpace(r.BillNumber)
	r.BillDate = strings.TrimSpace(r.BillDate)
	r.PaymentMethod = strings.TrimSpace(r.PaymentMethod)
	r.Cashier = strings.TrimSpace(r.Cashier)
	r.PriceTier = strings.TrimSpace(r.PriceTier)

	if r.PriceTier == "" {
		r.PriceTier = defaultPriceTier
	}

	if r.BillNumber == "" {
		fields.Add("bill_number", "bill_number is required")
	}

	if r.BillDate == "" {
		r.BillDate = time.Now().Format("2006-01-02")
	}

	if !validPriceTiers[r.PriceTier] {
		fields.Add("price_tier", "price_tier must be one of retail, customer_display, bought, wholesale")
	}

	if len(r.Items) == 0 {
		fields.Add("items", "at least one item is required")
	}

	for i := range r.Items {
		item := &r.Items[i]

		if item.Quantity <= 0 {
			fields.Add(fmt.Sprintf("items[%d].quantity", i), "quantity must be greater than zero")
		}

		if item.UnitPrice.IsNegative() {
			fields.Add(fmt.Sprintf("items[%d].unit_price", i), "unit_price cannot be negative")
		}
	}

	if r.TaxRate.IsNegative() {
		fields.Add("tax_rate", "tax_rate cannot be negative")
	}

	if r.Discount.IsNegative() {
		fields.Add("discount", "discount cannot be negative")
	}

	return fields
}

func CreateBill(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload createBillRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}

		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid request payload", fields)
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

		bill := models.Bill{
			OutletID:      outletID,
			BillNumber:    payload.BillNumber,
			BillDate:      payload.BillDate,
			CustomerName:  strings.TrimSpace(payload.CustomerName),
			CustomerPhone: strings.TrimSpace(payload.CustomerPhone),
			PaymentMethod: payload.PaymentMethod,
			Cashier:       payload.Cashier,
			PriceTier:     payload.PriceTier,
			TaxRate:       payload.TaxRate,
			Discount:      payload.Discount,
			Notes:         strings.TrimSpace(payload.Notes),
		}

		txErr := db.Transaction(func(tx *gorm.DB) error {
			actorID := principal.UserID
			products := make(map[uint]models.Product, len(payload.Items))
			pricingItems := make([]pricing.Item, 0, len(payload.Items))
			resolvedSKUs := make([]string, 0, len(payload.Items))

			for _, item := range payload.Items {
				line := pricing.Item{ProductID: item.ProductID, Title: strings.TrimSpace(item.Name), Quantity: item.Quantity, Unit: item.Unit, UnitPrice: item.UnitPrice, RetailPrice: item.RetailPrice, CustomerDisplayPrice: item.CustomerDisplayPrice, BoughtPrice: item.BoughtPrice, WholesalePrice: item.WholeSalePrice}
				sku := strings.TrimSpace(item.SKUID)

				if item.ProductID != nil && *item.ProductID != 0 {
					var product models.Product
					if err := tx.Clauses(lockProductsForUpdate()).Where("id = ? AND outlet_id = ?", *item.ProductID, outletID).First(&product).Error; err != nil {
						if err == gorm.ErrRecordNotFound {
							return &insufficientStockError{product: item.Name}
						}
						return err
					}

					if product.Quantity < item.Quantity {
						return &insufficientStockError{
							product:   product.Title,
							available: product.Quantity,
							requested: item.Quantity,
						}
					}

					if err := tx.Model(&models.Product{}).
						Where("id = ?", product.ID).
						UpdateColumn("quantity", gorm.Expr("quantity - ?", item.Quantity)).Error; err != nil {
						return err
					}

					products[product.ID] = product
					line.ProductID = &product.ID
					line.Title, line.Unit = product.Title, product.Unit
					if sku == "" {
						sku = product.SKUID
					}
				}
				pricingItems = append(pricingItems, line)
				resolvedSKUs = append(resolvedSKUs, sku)
			}

			quote, err := pricing.Build(products, pricingItems, payload.PriceTier, bill.TaxRate, bill.Discount)
			if err != nil {
				return err
			}
			bill.Subtotal, bill.RetailTotal = quote.Subtotal, quote.RetailTotal
			bill.WholesaleTotal, bill.BoughtTotal = quote.WholesaleTotal, quote.BoughtTotal
			bill.CustomerDisplayTotal, bill.TaxAmount, bill.Total = quote.CustomerDisplayTotal, quote.TaxAmount, quote.Total
			for index, line := range quote.Lines {
				bill.Items = append(bill.Items, models.BillItem{ProductID: line.ProductID, Title: line.Title, SKUID: resolvedSKUs[index], Quantity: line.Quantity, Unit: line.Unit, UnitPrice: line.UnitPrice, Amount: line.Amount, RetailPrice: line.RetailPrice, CustomerDisplayPrice: line.CustomerDisplayPrice, BoughtPrice: line.BoughtPrice, WholeSalePrice: line.WholesalePrice})
			}

			if err := tx.Create(&bill).Error; err != nil {
				return err
			}
			for _, line := range quote.Lines {
				if line.ProductID == nil {
					continue
				}
				if err := inventory.Record(tx, products[*line.ProductID], -line.Quantity, inventory.ReasonSale, &actorID, "bill", bill.ID); err != nil {
					return err
				}
			}
			return nil
		})

		if txErr != nil {
			if stockErr, ok := asInsufficientStock(txErr); ok {
				api.WriteError(w, http.StatusConflict, stockErr.message())
				return
			}

			if api.IsUniqueViolation(txErr) {
				api.WriteError(w, http.StatusConflict, "bill number already exists")
				return
			}

			api.WriteError(w, http.StatusInternalServerError, "could not create bill")
			return
		}

		api.WriteSuccess(w, http.StatusCreated, bill)
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
