package models

import "time"

type Bill struct {
	ID                   uint       `gorm:"primaryKey;column:id" json:"id"`
	BillNumber           string     `gorm:"column:bill_number;type:varchar(80);not null;uniqueIndex" json:"bill_number"`
	BillDate             string     `gorm:"column:bill_date;type:varchar(10);not null" json:"bill_date"`
	CustomerName         string     `gorm:"column:customer_name;type:varchar(180)" json:"customer_name"`
	CustomerPhone        string     `gorm:"column:customer_phone;type:varchar(40)" json:"customer_phone"`
	PaymentMethod        string     `gorm:"column:payment_method;type:varchar(40);not null;default:cash" json:"payment_method"`
	Cashier              string     `gorm:"column:cashier;type:varchar(120)" json:"cashier"`
	PriceTier            string     `gorm:"column:price_tier;type:varchar(40);not null;default:retail" json:"price_tier"`
	Subtotal             float64    `gorm:"column:subtotal;type:numeric(12,2);not null;default:0" json:"subtotal"`
	RetailTotal          float64    `gorm:"column:retail_total;type:numeric(12,2);not null;default:0" json:"retail_total"`
	WholesaleTotal       float64    `gorm:"column:wholesale_total;type:numeric(12,2);not null;default:0" json:"wholesale_total"`
	BoughtTotal          float64    `gorm:"column:bought_total;type:numeric(12,2);not null;default:0" json:"bought_total"`
	CustomerDisplayTotal float64    `gorm:"column:customer_display_total;type:numeric(12,2);not null;default:0" json:"customer_display_total"`
	TaxRate              float64    `gorm:"column:tax_rate;type:numeric(8,2);not null;default:0" json:"tax_rate"`
	TaxAmount            float64    `gorm:"column:tax_amount;type:numeric(12,2);not null;default:0" json:"tax_amount"`
	Discount             float64    `gorm:"column:discount;type:numeric(12,2);not null;default:0" json:"discount"`
	Total                float64    `gorm:"column:total;type:numeric(12,2);not null;default:0" json:"total"`
	Notes                string     `gorm:"column:notes;type:text" json:"notes"`
	Items                []BillItem `gorm:"foreignKey:BillID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"items,omitempty"`
	CreatedAt            time.Time  `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time  `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (Bill) TableName() string {
	return "bills"
}

type BillItem struct {
	ID                   uint      `gorm:"primaryKey;column:id" json:"id"`
	BillID               uint      `gorm:"column:bill_id;not null;index" json:"bill_id"`
	ProductID            *uint     `gorm:"column:product_id;index" json:"product_id,omitempty"`
	Title                string    `gorm:"column:title;type:varchar(180);not null" json:"title"`
	SKUID                string    `gorm:"column:sku_id;type:varchar(80)" json:"sku_id,omitempty"`
	Quantity             int       `gorm:"column:quantity;not null;default:0" json:"quantity"`
	Unit                 string    `gorm:"column:unit;type:varchar(40)" json:"unit"`
	UnitPrice            float64   `gorm:"column:unit_price;type:numeric(12,2);not null;default:0" json:"unit_price"`
	Amount               float64   `gorm:"column:amount;type:numeric(12,2);not null;default:0" json:"amount"`
	RetailPrice          float64   `gorm:"column:retail_price;type:numeric(12,2);not null;default:0" json:"retail_price"`
	CustomerDisplayPrice float64   `gorm:"column:customer_display_price;type:numeric(12,2);not null;default:0" json:"customer_display_price"`
	BoughtPrice          float64   `gorm:"column:bought_price;type:numeric(12,2);not null;default:0" json:"bought_price"`
	WholeSalePrice       float64   `gorm:"column:whole_sale_price;type:numeric(12,2);not null;default:0" json:"whole_sale_price"`
	CreatedAt            time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (BillItem) TableName() string {
	return "bill_items"
}
