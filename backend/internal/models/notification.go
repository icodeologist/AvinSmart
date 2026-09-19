package models

import "time"

type Notification struct {
	ID            uint       `gorm:"primaryKey;column:id" json:"id"`
	RecipientID   uint       `gorm:"column:recipient_id;not null;index" json:"recipient_id"`
	RecipientType string     `gorm:"column:recipient_type;type:varchar(30);not null;index" json:"recipient_type"`
	Type          string     `gorm:"column:type;type:varchar(50);not null;default:general" json:"type"`
	Title         string     `gorm:"column:title;type:varchar(180);not null" json:"title"`
	Message       string     `gorm:"column:message;type:text;not null" json:"message"`
	ActionURL     string     `gorm:"column:action_url;type:varchar(255)" json:"action_url,omitempty"`
	ReadAt        *time.Time `gorm:"column:read_at" json:"read_at"`
	CreatedAt     time.Time  `gorm:"column:created_at;autoCreateTime;index" json:"created_at"`
}

func (Notification) TableName() string {
	return "notifications"
}
