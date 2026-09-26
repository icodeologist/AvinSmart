package models

import "time"

type Admin struct {
	ID           uint      `gorm:"primaryKey;column:id" json:"id"`
	Username     string    `gorm:"column:username;type:varchar(80);not null;uniqueIndex" json:"username"`
	Email        string    `gorm:"column:email;type:varchar(180);not null;uniqueIndex" json:"email"`
	PasswordHash string    `gorm:"column:password_hash;type:text;not null" json:"-"`
	PhoneNum     string    `gorm:"column:phone_num;type:varchar(30);not null" json:"phone_num"`
	Photo        string    `gorm:"column:photo;type:text" json:"photo"`
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (Admin) TableName() string {
	return "admins"
}
