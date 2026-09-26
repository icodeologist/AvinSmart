package models

import (
	"time"

	"avinsmart/backend/internal/money"
)

type Product struct {
	ID                   uint         `gorm:"primaryKey;column:id" json:"id"`
	Title                string       `gorm:"column:title;type:varchar(180);not null" json:"title"`
	Description          string       `gorm:"column:description;type:text" json:"description"`
	OutletID             uint         `gorm:"column:outlet_id;not null;default:0;index" json:"outlet_id"`
	Outlet               Outlet       `gorm:"foreignKey:OutletID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"outlet,omitempty"`
	CategoryID           uint         `gorm:"column:category_id;not null;index" json:"category_id"`
	Category             Category     `gorm:"foreignKey:CategoryID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"category"`
	SubCategoryID        uint         `gorm:"column:sub_category_id;not null;index" json:"sub_category_id"`
	SubCategory          SubCategory  `gorm:"foreignKey:SubCategoryID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"sub_category"`
	SKUID                string       `gorm:"column:sku_id;type:varchar(80);not null;uniqueIndex:idx_products_outlet_sku" json:"sku_id"`
	Quantity             int          `gorm:"column:quantity;not null;default:0" json:"quantity"`
	Unit                 string       `gorm:"column:unit;type:varchar(40)" json:"unit"`
	RetailPrice          money.Amount `gorm:"column:retail_price;type:numeric(12,2);not null;default:0" json:"retail_price"`
	CustomerDisplayPrice money.Amount `gorm:"column:customer_display_price;type:numeric(12,2);not null;default:0" json:"customer_display_price"`
	BoughtPrice          money.Amount `gorm:"column:bought_price;type:numeric(12,2);not null;default:0" json:"bought_price"`
	WholeSalePrice       money.Amount `gorm:"column:whole_sale_price;type:numeric(12,2);not null;default:0" json:"whole_sale_price"`
	CreatedAt            time.Time    `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time    `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	Image                string       `gorm:"column:image;type:text" json:"image"`
}

func (Product) TableName() string {
	return "products"
}
