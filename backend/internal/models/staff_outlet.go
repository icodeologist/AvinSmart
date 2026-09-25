package models

import "time"

// StaffOutlet grants a staff member access to one outlet. Admin users do not
// need rows here because they have explicit system-wide access.
type StaffOutlet struct {
	StaffID   uint      `gorm:"primaryKey;column:staff_id" json:"staff_id"`
	OutletID  uint      `gorm:"primaryKey;column:outlet_id" json:"outlet_id"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (StaffOutlet) TableName() string { return "staff_outlets" }
