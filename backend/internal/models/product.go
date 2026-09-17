package models

import (
	"time"
)

type Product struct {
	ID                   uint         `gorm:"primaryKey;column:id" json:"id"`
	Title                string       `gorm:"column:title;type:varchar(180);not null" json:"title"`
	Description          string       `gorm:"column:description;type:text" json:"description"`
	CategoryID           uint         `gorm:"column:category_id;not null;index" json:"category_id"`
	Category             Category     `gorm:"foreignKey:CategoryID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"category"`
	SubCategoryID        *uint        `gorm:"column:sub_category_id;index" json:"sub_category_id,omitempty"`
	SubCategory          *SubCategory `gorm:"foreignKey:SubCategoryID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL" json:"sub_category,omitempty"`
	SKUID                string       `gorm:"column:sku_id;type:varchar(80);not null;uniqueIndex" json:"sku_id"`
	Quantity             int          `gorm:"column:quantity;not null;default:0" json:"quantity"`
	Unit                 string       `gorm:"column:unit;type:varchar(40)" json:"unit"`
	RetailPrice          float64      `gorm:"column:retail_price;type:numeric(12,2);not null;default:0" json:"retail_price"`
	CustomerDisplayPrice float64      `gorm:"column:customer_display_price;type:numeric(12,2);not null;default:0" json:"customer_display_price"`
	BoughtPrice          float64      `gorm:"column:bought_price;type:numeric(12,2);not null;default:0" json:"bought_price"`
	WholeSalePrice       float64      `gorm:"column:whole_sale_price;type:numeric(12,2);not null;default:0" json:"whole_sale_price"`
	CreatedAt            time.Time    `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time    `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	Image                string       `gorm:"column:image;type:text" json:"image"`
}

func (Product) TableName() string {
	return "products"
}
