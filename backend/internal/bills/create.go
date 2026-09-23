package bills

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"

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
	BillDate      string            `json:"bill_date"`
	CustomerName  string            `json:"customer_name"`
	CustomerPhone string            `json:"customer_phone"`
	PaymentMethod string            `json:"payment_method"`
	Cashier       string            `json:"cashier"`
	PriceTier     string            `json:"price_tier"`
	TaxRate       float64           `json:"tax_rate"`
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

	if r.TaxRate < 0 {
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

		bill := models.Bill{
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
			var subtotal, retailTotal, wholesaleTotal, boughtTotal, customerDisplayTotal = money.Zero(), money.Zero(), money.Zero(), money.Zero(), money.Zero()

			for _, item := range payload.Items {
				line := snapshotItem(item)

				if item.ProductID != nil && *item.ProductID != 0 {
					var product models.Product
					if err := tx.Clauses(lockProductsForUpdate()).First(&product, *item.ProductID).Error; err != nil {
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

					line.ProductID = &product.ID
					line.Title = product.Title
					line.RetailPrice = product.RetailPrice
					line.CustomerDisplayPrice = product.CustomerDisplayPrice
					line.BoughtPrice = product.BoughtPrice
					line.WholeSalePrice = product.WholeSalePrice
					if line.SKUID == "" {
						line.SKUID = product.SKUID
					}
					if line.Unit == "" {
						line.Unit = product.Unit
					}
					line.UnitPrice = priceForTier(&product, payload.PriceTier)
				}

				line.Amount = line.UnitPrice.Multiply(line.Quantity)
				bill.Items = append(bill.Items, line)
				subtotal = subtotal.Add(line.Amount)
				retailTotal = retailTotal.Add(line.RetailPrice.Multiply(line.Quantity))
				wholesaleTotal = wholesaleTotal.Add(line.WholeSalePrice.Multiply(line.Quantity))
				boughtTotal = boughtTotal.Add(line.BoughtPrice.Multiply(line.Quantity))
				customerDisplayTotal = customerDisplayTotal.Add(line.CustomerDisplayPrice.Multiply(line.Quantity))
			}

			bill.Subtotal = subtotal
			bill.RetailTotal = retailTotal
			bill.WholesaleTotal = wholesaleTotal
			bill.BoughtTotal = boughtTotal
			bill.CustomerDisplayTotal = customerDisplayTotal
			bill.TaxAmount = subtotal.ApplyRate(decimal.NewFromFloat(bill.TaxRate))
			bill.Total = subtotal.Add(bill.TaxAmount).Sub(bill.Discount)
			if bill.Total.IsNegative() {
				bill.Total = money.Zero()
			}

			return tx.Create(&bill).Error
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

func snapshotItem(item billItemRequest) models.BillItem {
	return models.BillItem{
		ProductID:            item.ProductID,
		Title:                item.Name,
		SKUID:                item.SKUID,
		Quantity:             item.Quantity,
		Unit:                 item.Unit,
		UnitPrice:            item.UnitPrice,
		Amount:               item.Amount,
		RetailPrice:          item.RetailPrice,
		CustomerDisplayPrice: item.CustomerDisplayPrice,
		BoughtPrice:          item.BoughtPrice,
		WholeSalePrice:       item.WholeSalePrice,
	}
}

func priceForTier(product *models.Product, tier string) money.Amount {
	switch tier {
	case "customer_display":
		return product.CustomerDisplayPrice
	case "bought":
		return product.BoughtPrice
	case "wholesale":
		return product.WholeSalePrice
	default:
		return product.RetailPrice
	}
}
