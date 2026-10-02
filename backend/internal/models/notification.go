package models

import "time"

type NotificationMetadata struct {
	OrderID       uint   `json:"order_id,omitempty"`
	OrderNumber   string `json:"order_number,omitempty"`
	OutletID      uint   `json:"outlet_id,omitempty"`
	OutletName    string `json:"outlet_name,omitempty"`
	StaffID       uint   `json:"staff_id,omitempty"`
	StaffName     string `json:"staff_name,omitempty"`
	StaffEmail    string `json:"staff_email,omitempty"`
	CustomerID    *uint  `json:"customer_id"`
	CustomerName  string `json:"customer_name"`
	Total         string `json:"total,omitempty"`
	PaymentMethod string `json:"payment_method,omitempty"`
}

type Notification struct {
	ID            uint                 `gorm:"primaryKey;column:id" json:"id"`
	RecipientID   uint                 `gorm:"column:recipient_id;not null;index" json:"recipient_id"`
	RecipientType string               `gorm:"column:recipient_type;type:varchar(30);not null;index" json:"recipient_type"`
	Type          string               `gorm:"column:type;type:varchar(50);not null;default:general" json:"type"`
	Title         string               `gorm:"column:title;type:varchar(180);not null" json:"title"`
	Message       string               `gorm:"column:message;type:text;not null" json:"message"`
	ActionURL     string               `gorm:"column:action_url;type:varchar(255)" json:"action_url,omitempty"`
	Metadata      NotificationMetadata `gorm:"column:metadata;type:jsonb;serializer:json" json:"metadata"`
	ReadAt        *time.Time           `gorm:"column:read_at" json:"read_at"`
	CreatedAt     time.Time            `gorm:"column:created_at;autoCreateTime;index" json:"created_at"`
}

func (Notification) TableName() string {
	return "notifications"
}
