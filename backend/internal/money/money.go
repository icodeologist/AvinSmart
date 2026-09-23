// Package money defines the API and calculation representation for INR money.
//
// Monetary values cross the API boundary as decimal strings, for example
// "10.50". They are never represented as JSON floating-point numbers.
package money

import (
	"bytes"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/shopspring/decimal"
)

const Currency = "INR"

// Amount is an exact INR amount with a maximum precision of two decimal
// places. The embedded decimal.Decimal is deliberately not exposed through
// JSON: the custom marshaler keeps the API contract as a quoted decimal.
type Amount struct {
	decimal.Decimal
}

func Zero() Amount { return Amount{Decimal: decimal.Zero} }

func Parse(value string) (Amount, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return Zero(), fmt.Errorf("money value is required")
	}

	parsed, err := decimal.NewFromString(value)
	if err != nil {
		return Zero(), fmt.Errorf("invalid INR amount %q: %w", value, err)
	}
	if parsed.Exponent() < -2 {
		return Zero(), fmt.Errorf("INR amount %q has more than two decimal places", value)
	}

	return Amount{Decimal: parsed}, nil
}

func MustParse(value string) Amount {
	amount, err := Parse(value)
	if err != nil {
		panic(err)
	}
	return amount
}

func FromDecimal(value decimal.Decimal) (Amount, error) {
	if value.Exponent() < -2 {
		return Zero(), fmt.Errorf("INR amount has more than two decimal places")
	}
	return Amount{Decimal: value}, nil
}

func (a Amount) String() string { return a.Decimal.StringFixed(2) }

func (a Amount) MarshalJSON() ([]byte, error) {
	return json.Marshal(a.String())
}

// Value and Scan let Amount be stored in PostgreSQL numeric columns without
// converting through float64.
func (a Amount) Value() (driver.Value, error) { return a.String(), nil }

func (a *Amount) Scan(value interface{}) error {
	switch value := value.(type) {
	case nil:
		*a = Zero()
		return nil
	case []byte:
		parsed, err := Parse(string(value))
		if err != nil {
			return err
		}
		*a = parsed
		return nil
	case string:
		parsed, err := Parse(value)
		if err != nil {
			return err
		}
		*a = parsed
		return nil
	default:
		return fmt.Errorf("cannot scan %T as INR amount", value)
	}
}

func (a *Amount) UnmarshalJSON(data []byte) error {
	data = bytes.TrimSpace(data)
	if len(data) == 0 || bytes.Equal(data, []byte("null")) {
		return fmt.Errorf("INR amount must be a decimal string")
	}

	var value string
	if err := json.Unmarshal(data, &value); err != nil {
		return fmt.Errorf("INR amount must be a decimal string: %w", err)
	}
	parsed, err := Parse(value)
	if err != nil {
		return err
	}
	*a = parsed
	return nil
}

func (a Amount) Add(other Amount) Amount {
	return Amount{Decimal: a.Decimal.Add(other.Decimal)}
}

func (a Amount) Sub(other Amount) Amount {
	return Amount{Decimal: a.Decimal.Sub(other.Decimal)}
}

func (a Amount) Multiply(quantity int) Amount {
	return Amount{Decimal: a.Decimal.Mul(decimal.NewFromInt(int64(quantity)))}
}

// ApplyRate calculates amount * rate / 100 and rounds once to paise using
// shopspring/decimal's half-away-from-zero rounding.
func (a Amount) ApplyRate(rate decimal.Decimal) Amount {
	return Amount{Decimal: a.Decimal.Mul(rate).Div(decimal.NewFromInt(100)).Round(2)}
}

func (a Amount) IsNegative() bool { return a.Decimal.IsNegative() }

func (a Amount) IsZero() bool { return a.Decimal.IsZero() }

func (a Amount) GreaterThan(other Amount) bool { return a.Decimal.GreaterThan(other.Decimal) }

func (a Amount) LessThan(other Amount) bool { return a.Decimal.LessThan(other.Decimal) }
