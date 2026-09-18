package models

import "time"

type Outlet struct {
	ID            uint       `gorm:"primaryKey;column:id" json:"id"`
	Name          string     `gorm:"column:name;type:varchar(180);not null;uniqueIndex" json:"name"`
	Location      string     `gorm:"column:location;type:text" json:"location"`
	ContactPerson string     `gorm:"column:contact_person;type:varchar(120)" json:"contact_person"`
	Phone         string     `gorm:"column:phone;type:varchar(40)" json:"phone"`
	Email         string     `gorm:"column:email;type:varchar(120)" json:"email"`
	Status        string     `gorm:"column:status;type:varchar(20);not null;default:active" json:"status"`
	CreatedAt     time.Time  `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	LockedAt      *time.Time `gorm:"column:locked_at" json:"locked_at,omitempty"`
}

func (Outlet) TableName() string {
	return "outlets"
}
