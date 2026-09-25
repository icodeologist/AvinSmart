package models

import "time"

import "avinsmart/backend/internal/money"

type Order struct {
	ID                   uint         `gorm:"primaryKey" json:"id"`
	OutletID             uint         `gorm:"column:outlet_id;not null;index" json:"outlet_id"`
	Outlet               Outlet       `gorm:"foreignKey:OutletID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"outlet,omitempty"`
	OrderNumber          string       `gorm:"column:order_number;type:varchar(80);not null;uniqueIndex" json:"order_number"`
	Status               string       `gorm:"column:status;type:varchar(20);not null;default:pending;index" json:"status"`
	PriceTier            string       `gorm:"column:price_tier;type:varchar(40);not null;default:retail" json:"price_tier"`
	Total                money.Amount `gorm:"column:total;type:numeric(12,2);not null;default:0" json:"total"`
	RetailTotal          money.Amount `gorm:"column:retail_total;type:numeric(12,2);not null;default:0" json:"retail_total"`
	CustomerDisplayTotal money.Amount `gorm:"column:customer_display_total;type:numeric(12,2);not null;default:0" json:"customer_display_total"`
	BoughtTotal          money.Amount `gorm:"column:bought_total;type:numeric(12,2);not null;default:0" json:"bought_total"`
	WholesaleTotal       money.Amount `gorm:"column:wholesale_total;type:numeric(12,2);not null;default:0" json:"wholesale_total"`
	AmountPaid           money.Amount `gorm:"column:amount_paid;type:numeric(12,2);not null;default:0" json:"amount_paid"`
	AmountDue            money.Amount `gorm:"column:amount_due;type:numeric(12,2);not null;default:0" json:"amount_due"`
	Cashier              string       `gorm:"column:cashier;type:varchar(120)" json:"cashier"`
	ExpiresAt            *time.Time   `gorm:"column:expires_at;index" json:"expires_at,omitempty"`
	CancelledAt          *time.Time   `gorm:"column:cancelled_at" json:"cancelled_at,omitempty"`
	StockReleasedAt      *time.Time   `gorm:"column:stock_released_at" json:"stock_released_at,omitempty"`
	Items                []OrderItem  `gorm:"foreignKey:OrderID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"items,omitempty"`
	Payments             []Payment    `gorm:"foreignKey:OrderID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"payments,omitempty"`
	CreatedAt            time.Time    `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time    `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Order) TableName() string { return "orders" }

type OrderItem struct {
	ID                   uint         `gorm:"primaryKey" json:"id"`
	OrderID              uint         `gorm:"column:order_id;not null;index" json:"order_id"`
	ProductID            uint         `gorm:"column:product_id;not null;index" json:"product_id"`
	Title                string       `gorm:"column:title;type:varchar(180);not null" json:"title"`
	Quantity             int          `gorm:"column:quantity;not null" json:"quantity"`
	UnitPrice            money.Amount `gorm:"column:unit_price;type:numeric(12,2);not null" json:"unit_price"`
	Amount               money.Amount `gorm:"column:amount;type:numeric(12,2);not null" json:"amount"`
	RetailPrice          money.Amount `gorm:"column:retail_price;type:numeric(12,2);not null;default:0" json:"retail_price"`
	CustomerDisplayPrice money.Amount `gorm:"column:customer_display_price;type:numeric(12,2);not null;default:0" json:"customer_display_price"`
	BoughtPrice          money.Amount `gorm:"column:bought_price;type:numeric(12,2);not null;default:0" json:"bought_price"`
	WholesalePrice       money.Amount `gorm:"column:wholesale_price;type:numeric(12,2);not null;default:0" json:"wholesale_price"`
}

func (OrderItem) TableName() string { return "order_items" }

type Payment struct {
	ID           uint         `gorm:"primaryKey" json:"id"`
	OrderID      uint         `gorm:"column:order_id;not null;index" json:"order_id"`
	OutletID     uint         `gorm:"column:outlet_id;not null;index" json:"outlet_id"`
	Amount       money.Amount `gorm:"column:amount;type:numeric(12,2);not null" json:"amount"`
	Method       string       `gorm:"column:method;type:varchar(40);not null" json:"method"`
	CashTendered money.Amount `gorm:"column:cash_tendered;type:numeric(12,2);not null;default:0" json:"cash_tendered"`
	ChangeGiven  money.Amount `gorm:"column:change_given;type:numeric(12,2);not null;default:0" json:"change_given"`
	RefundedAt   *time.Time   `gorm:"column:refunded_at" json:"refunded_at,omitempty"`
	RefundedBy   *uint        `gorm:"column:refunded_by" json:"refunded_by,omitempty"`
	RefundReason string       `gorm:"column:refund_reason;type:text" json:"refund_reason,omitempty"`
	CreatedAt    time.Time    `gorm:"autoCreateTime" json:"created_at"`
}

func (Payment) TableName() string { return "payments" }
