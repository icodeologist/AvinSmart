package models

import "time"

// IdempotencyRecord stores the result of a mutating request so a client can
// safely retry the same operation after a network failure.
type IdempotencyRecord struct {
	ID             uint      `gorm:"primaryKey"`
	Operation      string    `gorm:"column:operation;type:varchar(180);not null;uniqueIndex:idx_idempotency_operation_key"`
	Key            string    `gorm:"column:key;type:varchar(128);not null;uniqueIndex:idx_idempotency_operation_key"`
	RequestHash    string    `gorm:"column:request_hash;type:char(64);not null"`
	ResponseStatus int       `gorm:"column:response_status;not null;default:0"`
	ResponseBody   string    `gorm:"column:response_body;type:text"`
	ResponseHeader string    `gorm:"column:response_header;type:text"`
	CreatedAt      time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt      time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (IdempotencyRecord) TableName() string { return "idempotency_records" }
