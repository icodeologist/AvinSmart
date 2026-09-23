package pricing

import (
	"testing"

	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"

	"github.com/shopspring/decimal"
)

func TestBuildUsesExactPriceTierTotals(t *testing.T) {
	product := models.Product{
		ID:                   1,
		Title:                "Test item",
		Unit:                 "pcs",
		RetailPrice:          money.MustParse("0.10"),
		CustomerDisplayPrice: money.MustParse("0.20"),
		BoughtPrice:          money.MustParse("0.05"),
		WholeSalePrice:       money.MustParse("0.15"),
	}
	quote, err := Build(map[uint]models.Product{product.ID: product}, []Item{{ProductID: &product.ID, Quantity: 3}}, "retail", decimal.Zero, money.Zero())
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}
	if quote.Subtotal.String() != "0.30" || quote.Total.String() != "0.30" {
		t.Fatalf("quote subtotal/total = %s/%s, want 0.30/0.30", quote.Subtotal.String(), quote.Total.String())
	}
}

func TestBuildAppliesTaxAndDiscountToSelectedTier(t *testing.T) {
	product := models.Product{ID: 1, RetailPrice: money.MustParse("100.00"), CustomerDisplayPrice: money.MustParse("120.00"), BoughtPrice: money.MustParse("80.00"), WholeSalePrice: money.MustParse("90.00")}
	quote, err := Build(map[uint]models.Product{product.ID: product}, []Item{{ProductID: &product.ID, Quantity: 1}}, "wholesale", decimal.RequireFromString("18"), money.MustParse("5.00"))
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}
	if quote.Subtotal.String() != "90.00" || quote.TaxAmount.String() != "16.20" || quote.Total.String() != "101.20" {
		t.Fatalf("quote = subtotal %s, tax %s, total %s; want 90.00, 16.20, 101.20", quote.Subtotal.String(), quote.TaxAmount.String(), quote.Total.String())
	}
}

func TestBuildPreservesFractionalTaxRate(t *testing.T) {
	product := models.Product{ID: 1, RetailPrice: money.MustParse("100.00")}
	quote, err := Build(map[uint]models.Product{product.ID: product}, []Item{{ProductID: &product.ID, Quantity: 1}}, "retail", decimal.RequireFromString("18.125"), money.Zero())
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}
	if quote.TaxRate != "18.125" || quote.TaxAmount.String() != "18.13" || quote.Total.String() != "118.13" {
		t.Fatalf("quote = rate %s, tax %s, total %s; want 18.125, 18.13, 118.13", quote.TaxRate, quote.TaxAmount.String(), quote.Total.String())
	}
}
