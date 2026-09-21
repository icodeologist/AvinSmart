package models

import "time"

type Order struct {
	ID                   uint        `gorm:"primaryKey" json:"id"`
	OrderNumber          string      `gorm:"column:order_number;type:varchar(80);not null;uniqueIndex" json:"order_number"`
	Status               string      `gorm:"column:status;type:varchar(20);not null;default:pending;index" json:"status"`
	PriceTier            string      `gorm:"column:price_tier;type:varchar(40);not null;default:retail" json:"price_tier"`
	Total                float64     `gorm:"column:total;type:numeric(12,2);not null;default:0" json:"total"`
	RetailTotal          float64     `gorm:"column:retail_total;type:numeric(12,2);not null;default:0" json:"retail_total"`
	CustomerDisplayTotal float64     `gorm:"column:customer_display_total;type:numeric(12,2);not null;default:0" json:"customer_display_total"`
	BoughtTotal          float64     `gorm:"column:bought_total;type:numeric(12,2);not null;default:0" json:"bought_total"`
	WholesaleTotal       float64     `gorm:"column:wholesale_total;type:numeric(12,2);not null;default:0" json:"wholesale_total"`
	AmountPaid           float64     `gorm:"column:amount_paid;type:numeric(12,2);not null;default:0" json:"amount_paid"`
	AmountDue            float64     `gorm:"column:amount_due;type:numeric(12,2);not null;default:0" json:"amount_due"`
	Cashier              string      `gorm:"column:cashier;type:varchar(120)" json:"cashier"`
	Items                []OrderItem `gorm:"foreignKey:OrderID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"items,omitempty"`
	Payments             []Payment   `gorm:"foreignKey:OrderID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"payments,omitempty"`
	CreatedAt            time.Time   `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time   `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Order) TableName() string { return "orders" }

type OrderItem struct {
	ID                   uint    `gorm:"primaryKey" json:"id"`
	OrderID              uint    `gorm:"column:order_id;not null;index" json:"order_id"`
	ProductID            uint    `gorm:"column:product_id;not null;index" json:"product_id"`
	Title                string  `gorm:"column:title;type:varchar(180);not null" json:"title"`
	Quantity             int     `gorm:"column:quantity;not null" json:"quantity"`
	UnitPrice            float64 `gorm:"column:unit_price;type:numeric(12,2);not null" json:"unit_price"`
	Amount               float64 `gorm:"column:amount;type:numeric(12,2);not null" json:"amount"`
	RetailPrice          float64 `gorm:"column:retail_price;type:numeric(12,2);not null;default:0" json:"retail_price"`
	CustomerDisplayPrice float64 `gorm:"column:customer_display_price;type:numeric(12,2);not null;default:0" json:"customer_display_price"`
	BoughtPrice          float64 `gorm:"column:bought_price;type:numeric(12,2);not null;default:0" json:"bought_price"`
	WholesalePrice       float64 `gorm:"column:wholesale_price;type:numeric(12,2);not null;default:0" json:"wholesale_price"`
}

func (OrderItem) TableName() string { return "order_items" }

type Payment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	OrderID   uint      `gorm:"column:order_id;not null;index" json:"order_id"`
	Amount    float64   `gorm:"column:amount;type:numeric(12,2);not null" json:"amount"`
	Method    string    `gorm:"column:method;type:varchar(40);not null" json:"method"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (Payment) TableName() string { return "payments" }
