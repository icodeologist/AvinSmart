package bills

import (
	"errors"
	"fmt"

	"gorm.io/gorm/clause"
)

type insufficientStockError struct {
	product   string
	available int
	requested int
}

func (e *insufficientStockError) Error() string {
	return e.message()
}

func (e *insufficientStockError) message() string {
	if e.product != "" && e.requested > 0 {
		return fmt.Sprintf("insufficient stock for %s: %d requested, %d available", e.product, e.requested, e.available)
	}
	return "insufficient stock for one or more items"
}

func asInsufficientStock(err error) (*insufficientStockError, bool) {
	var stockErr *insufficientStockError
	if errors.As(err, &stockErr) {
		return stockErr, true
	}
	return nil, false
}

func lockProductsForUpdate() clause.Locking {
	return clause.Locking{Strength: "UPDATE"}
}