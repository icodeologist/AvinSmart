package pricing

import (
	"fmt"

	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"

	"github.com/shopspring/decimal"
)

var validPriceTiers = map[string]bool{
	"retail":           true,
	"customer_display": true,
	"bought":           true,
	"wholesale":        true,
}

type Item struct {
	ProductID            *uint
	Title                string
	Quantity             int
	Unit                 string
	UnitPrice            money.Amount
	RetailPrice          money.Amount
	CustomerDisplayPrice money.Amount
	BoughtPrice          money.Amount
	WholesalePrice       money.Amount
}

type Line struct {
	ProductID            *uint        `json:"product_id,omitempty"`
	Title                string       `json:"title"`
	Quantity             int          `json:"quantity"`
	Unit                 string       `json:"unit"`
	UnitPrice            money.Amount `json:"unit_price"`
	Amount               money.Amount `json:"amount"`
	RetailPrice          money.Amount `json:"retail_price"`
	CustomerDisplayPrice money.Amount `json:"customer_display_price"`
	BoughtPrice          money.Amount `json:"bought_price"`
	WholesalePrice       money.Amount `json:"wholesale_price"`
}

type Quote struct {
	PriceTier            string       `json:"price_tier"`
	Lines                []Line       `json:"lines"`
	Subtotal             money.Amount `json:"subtotal"`
	RetailTotal          money.Amount `json:"retail_total"`
	WholesaleTotal       money.Amount `json:"wholesale_total"`
	BoughtTotal          money.Amount `json:"bought_total"`
	CustomerDisplayTotal money.Amount `json:"customer_display_total"`
	TaxRate              string       `json:"tax_rate"`
	TaxAmount            money.Amount `json:"tax_amount"`
	Discount             money.Amount `json:"discount"`
	Total                money.Amount `json:"total"`
}

func Build(products map[uint]models.Product, items []Item, priceTier string, taxRate decimal.Decimal, discount money.Amount) (Quote, error) {
	if !validPriceTiers[priceTier] {
		return Quote{}, fmt.Errorf("price_tier must be retail, customer_display, bought, or wholesale")
	}
	if len(items) == 0 {
		return Quote{}, fmt.Errorf("at least one item is required")
	}
	if taxRate.IsNegative() {
		return Quote{}, fmt.Errorf("tax_rate cannot be negative")
	}
	if discount.IsNegative() {
		return Quote{}, fmt.Errorf("discount cannot be negative")
	}

	quote := Quote{PriceTier: priceTier, TaxRate: taxRate.String(), Discount: discount}
	for _, item := range items {
		if item.Quantity <= 0 {
			return Quote{}, fmt.Errorf("quantity must be greater than zero")
		}
		line := Line{ProductID: item.ProductID, Title: item.Title, Quantity: item.Quantity, Unit: item.Unit, UnitPrice: item.UnitPrice, RetailPrice: item.RetailPrice, CustomerDisplayPrice: item.CustomerDisplayPrice, BoughtPrice: item.BoughtPrice, WholesalePrice: item.WholesalePrice}
		if item.ProductID != nil {
			product, ok := products[*item.ProductID]
			if !ok {
				return Quote{}, fmt.Errorf("product %d not found", *item.ProductID)
			}
			line.Title, line.Unit = product.Title, product.Unit
			line.RetailPrice, line.CustomerDisplayPrice, line.BoughtPrice, line.WholesalePrice = product.RetailPrice, product.CustomerDisplayPrice, product.BoughtPrice, product.WholeSalePrice
		}
		switch priceTier {
		case "customer_display":
			line.UnitPrice = line.CustomerDisplayPrice
		case "bought":
			line.UnitPrice = line.BoughtPrice
		case "wholesale":
			line.UnitPrice = line.WholesalePrice
		default:
			line.UnitPrice = line.RetailPrice
		}
		line.Amount = line.UnitPrice.Multiply(line.Quantity)
		quote.Lines = append(quote.Lines, line)
		quote.Subtotal = quote.Subtotal.Add(line.Amount)
		quote.RetailTotal = quote.RetailTotal.Add(line.RetailPrice.Multiply(line.Quantity))
		quote.WholesaleTotal = quote.WholesaleTotal.Add(line.WholesalePrice.Multiply(line.Quantity))
		quote.BoughtTotal = quote.BoughtTotal.Add(line.BoughtPrice.Multiply(line.Quantity))
		quote.CustomerDisplayTotal = quote.CustomerDisplayTotal.Add(line.CustomerDisplayPrice.Multiply(line.Quantity))
	}
	quote.TaxAmount = quote.Subtotal.ApplyRate(taxRate)
	quote.Total = quote.Subtotal.Add(quote.TaxAmount).Sub(discount)
	if quote.Total.IsNegative() {
		quote.Total = money.Zero()
	}
	return quote, nil
}
