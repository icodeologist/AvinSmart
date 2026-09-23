package money

import (
	"encoding/json"
	"testing"

	"github.com/shopspring/decimal"
)

func TestParseAndFormatINR(t *testing.T) {
	amount, err := Parse("10.5")
	if err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	if got := amount.String(); got != "10.50" {
		t.Fatalf("String() = %q, want %q", got, "10.50")
	}
}

func TestExactAddition(t *testing.T) {
	got := ParseMustForTest("0.10").Add(ParseMustForTest("0.20"))
	if got.String() != "0.30" {
		t.Fatalf("0.10 + 0.20 = %s, want 0.30", got.String())
	}
}

func TestJSONUsesDecimalString(t *testing.T) {
	data, err := json.Marshal(ParseMustForTest("12.34"))
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}
	if string(data) != `"12.34"` {
		t.Fatalf("JSON = %s, want %s", data, `"12.34"`)
	}

	var decoded Amount
	if err := json.Unmarshal([]byte(`"12.34"`), &decoded); err != nil {
		t.Fatalf("Unmarshal() error = %v", err)
	}
	if decoded.String() != "12.34" {
		t.Fatalf("decoded = %s, want 12.34", decoded.String())
	}
}

func TestRejectsMoreThanTwoDecimalPlaces(t *testing.T) {
	if _, err := Parse("10.001"); err == nil {
		t.Fatal("Parse() accepted an amount with three decimal places")
	}
}

func TestTaxRateRoundsToPaise(t *testing.T) {
	amount := ParseMustForTest("10.00")
	tax := amount.ApplyRate(decimal.RequireFromString("18"))
	if tax.String() != "1.80" {
		t.Fatalf("tax = %s, want 1.80", tax.String())
	}
}

func ParseMustForTest(value string) Amount { return MustParse(value) }
