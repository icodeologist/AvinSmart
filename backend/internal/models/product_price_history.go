package models

import (
	"time"

	"avinsmart/backend/internal/money"
)

type ProductPriceHistory struct {
	ID                uint         `gorm:"primaryKey;column:id" json:"id"`
	ProductID         uint         `gorm:"column:product_id;not null;index" json:"product_id"`
	OutletID          uint         `gorm:"column:outlet_id;not null;index" json:"outlet_id"`
	ActorID           uint         `gorm:"column:actor_id;not null;index" json:"actor_id"`
	OldQuantity       int          `gorm:"column:old_quantity;not null;default:0" json:"old_quantity"`
	NewQuantity       int          `gorm:"column:new_quantity;not null;default:0" json:"new_quantity"`
	OldRetailPrice    money.Amount `gorm:"column:old_retail_price;type:numeric(12,2);not null" json:"old_retail_price"`
	NewRetailPrice    money.Amount `gorm:"column:new_retail_price;type:numeric(12,2);not null" json:"new_retail_price"`
	OldCustomerPrice  money.Amount `gorm:"column:old_customer_price;type:numeric(12,2);not null" json:"old_customer_price"`
	NewCustomerPrice  money.Amount `gorm:"column:new_customer_price;type:numeric(12,2);not null" json:"new_customer_price"`
	OldBoughtPrice    money.Amount `gorm:"column:old_bought_price;type:numeric(12,2);not null" json:"old_bought_price"`
	NewBoughtPrice    money.Amount `gorm:"column:new_bought_price;type:numeric(12,2);not null" json:"new_bought_price"`
	OldWholesalePrice money.Amount `gorm:"column:old_wholesale_price;type:numeric(12,2);not null" json:"old_wholesale_price"`
	NewWholesalePrice money.Amount `gorm:"column:new_wholesale_price;type:numeric(12,2);not null" json:"new_wholesale_price"`
	ChangedAt         time.Time    `gorm:"column:changed_at;autoCreateTime;index" json:"changed_at"`
}

func (ProductPriceHistory) TableName() string { return "product_price_histories" }
