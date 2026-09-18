package models

import "time"

type Salary struct {
	ID        uint       `gorm:"primaryKey;column:id" json:"id"`
	StaffID   uint       `gorm:"column:staff_id;not null;index;uniqueIndex:idx_salary_staff_period" json:"staff_id"`
	Staff     Staff      `gorm:"foreignKey:StaffID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"staff,omitempty"`
	Amount    float64    `gorm:"column:amount;type:numeric(12,2);not null" json:"amount"`
	Currency  string     `gorm:"column:currency;type:varchar(3);not null;default:USD" json:"currency"`
	PayPeriod string     `gorm:"column:pay_period;type:varchar(7);not null;uniqueIndex:idx_salary_staff_period" json:"pay_period"`
	Status    string     `gorm:"column:status;type:varchar(20);not null;default:pending" json:"status"`
	PaidAt    *time.Time `gorm:"column:paid_at" json:"paid_at,omitempty"`
	CreatedAt time.Time  `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time  `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (Salary) TableName() string {
	return "salaries"
}
