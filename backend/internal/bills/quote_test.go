package bills

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestQuoteEndpointUsesExactDecimalTaxRate(t *testing.T) {
	request := httptest.NewRequest("POST", "/api/v1/bills/quote", strings.NewReader(`{
		"price_tier": "retail",
		"tax_rate": "18.125",
		"discount": "0.00",
		"items": [{
			"name": "Test item",
			"quantity": 1,
			"unit": "pcs",
			"retail_price": "100.00",
			"customer_display_price": "100.00",
			"bought_price": "100.00",
			"whole_sale_price": "100.00"
		}]
	}
	`))
	response := httptest.NewRecorder()

	Quote(nil).ServeHTTP(response, request)

	if response.Code != 200 {
		t.Fatalf("Quote() status = %d, want 200: %s", response.Code, response.Body.String())
	}

	var payload struct {
		Success bool `json:"success"`
		Data    struct {
			TaxRate   string `json:"tax_rate"`
			TaxAmount string `json:"tax_amount"`
			Total     string `json:"total"`
		} `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode quote response: %v", err)
	}

	if !payload.Success {
		t.Fatalf("Quote() returned unsuccessful response: %s", response.Body.String())
	}
	if payload.Data.TaxRate != "18.125" || payload.Data.TaxAmount != "18.13" || payload.Data.Total != "118.13" {
		t.Fatalf("quote data = rate %s, tax %s, total %s; want 18.125, 18.13, 118.13", payload.Data.TaxRate, payload.Data.TaxAmount, payload.Data.Total)
	}
}
