package models

import "time"

type LeaveRequest struct {
	ID           uint       `gorm:"primaryKey;column:id" json:"id"`
	StaffID      uint       `gorm:"column:staff_id;not null;index;uniqueIndex:idx_leave_staff_date" json:"staff_id"`
	Staff        Staff      `gorm:"foreignKey:StaffID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"staff,omitempty"`
	Date         string     `gorm:"column:date;type:date;not null;index;uniqueIndex:idx_leave_staff_date" json:"date"`
	Reason       string     `gorm:"column:reason;type:text;not null" json:"reason"`
	Status       string     `gorm:"column:status;type:varchar(20);not null;default:pending" json:"status"`
	ReviewedByID *uint      `gorm:"column:reviewed_by_id" json:"reviewed_by_id,omitempty"`
	ReviewedAt   *time.Time `gorm:"column:reviewed_at" json:"reviewed_at,omitempty"`
	CreatedAt    time.Time  `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (LeaveRequest) TableName() string { return "leave_requests" }
