package models

import "time"

type Staff struct {
	ID           uint      `gorm:"primaryKey;column:id" json:"id"`
	Name         string    `gorm:"column:name;type:varchar(160);not null" json:"name"`
	Email        string    `gorm:"column:email;type:varchar(180);not null;uniqueIndex" json:"email"`
	PasswordHash string    `gorm:"column:password_hash;type:text;not null" json:"-"`
	Phone        string    `gorm:"column:phone;type:varchar(40);not null" json:"phone"`
	Role         string    `gorm:"column:role;type:varchar(40);not null" json:"role"`
	Status       string    `gorm:"column:status;type:varchar(20);not null;default:active" json:"status"`
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	Outlets      []Outlet  `gorm:"many2many:staff_outlets;" json:"outlets,omitempty"`
}

func (Staff) TableName() string {
	return "staff"
}
