package models

import "time"

type PayrollCalendar struct {
	ID          uint      `gorm:"primaryKey;column:id" json:"id"`
	PayPeriod   string    `gorm:"column:pay_period;type:varchar(7);not null;uniqueIndex" json:"pay_period"`
	WorkingDays int       `gorm:"column:working_days;not null" json:"working_days"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (PayrollCalendar) TableName() string { return "payroll_calendars" }

type PayrollAudit struct {
	ID        uint      `gorm:"primaryKey;column:id" json:"id"`
	Entity    string    `gorm:"column:entity;type:varchar(40);not null;index" json:"entity"`
	EntityID  uint      `gorm:"column:entity_id;not null;index" json:"entity_id"`
	Action    string    `gorm:"column:action;type:varchar(40);not null" json:"action"`
	ActorID   uint      `gorm:"column:actor_id;not null;index" json:"actor_id"`
	Before    string    `gorm:"column:before_value;type:jsonb" json:"before,omitempty"`
	After     string    `gorm:"column:after_value;type:jsonb" json:"after,omitempty"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (PayrollAudit) TableName() string { return "payroll_audits" }
