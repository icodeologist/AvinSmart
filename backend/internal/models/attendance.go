package models

import "time"

type Attendance struct {
	ID          uint      `gorm:"primaryKey;column:id" json:"id"`
	StaffID     uint      `gorm:"column:staff_id;not null;uniqueIndex:idx_attendance_staff_date" json:"staff_id"`
	Staff       Staff     `gorm:"foreignKey:StaffID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"staff,omitempty"`
	Date        string    `gorm:"column:date;type:date;not null;uniqueIndex:idx_attendance_staff_date" json:"date"`
	Status      string    `gorm:"column:status;type:varchar(20);not null" json:"status"`
	Note        string    `gorm:"column:note;type:text" json:"note,omitempty"`
	UpdatedByID *uint     `gorm:"column:updated_by_id" json:"updated_by_id,omitempty"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (Attendance) TableName() string { return "attendance" }
