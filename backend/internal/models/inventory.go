package models

import "time"

type InventoryMovement struct {
	ID            uint      `gorm:"primaryKey;column:id" json:"id"`
	OutletID      uint      `gorm:"column:outlet_id;not null;index" json:"outlet_id"`
	ProductID     uint      `gorm:"column:product_id;not null;index" json:"product_id"`
	Product       Product   `gorm:"foreignKey:ProductID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"product,omitempty"`
	QuantityDelta int       `gorm:"column:quantity_delta;not null" json:"quantity_delta"`
	Reason        string    `gorm:"column:reason;type:varchar(40);not null;index" json:"reason"`
	ActorID       *uint     `gorm:"column:actor_id;index" json:"actor_id,omitempty"`
	ReferenceType string    `gorm:"column:reference_type;type:varchar(40)" json:"reference_type,omitempty"`
	ReferenceID   *uint     `gorm:"column:reference_id" json:"reference_id,omitempty"`
	CreatedAt     time.Time `gorm:"column:created_at;autoCreateTime;index" json:"created_at"`
}

func (InventoryMovement) TableName() string { return "inventory_movements" }

type InventoryTransfer struct {
	ID                   uint      `gorm:"primaryKey;column:id" json:"id"`
	SourceOutletID       uint      `gorm:"column:source_outlet_id;not null;index" json:"source_outlet_id"`
	DestinationOutletID  uint      `gorm:"column:destination_outlet_id;not null;index" json:"destination_outlet_id"`
	SourceProductID      uint      `gorm:"column:source_product_id;not null" json:"source_product_id"`
	DestinationProductID uint      `gorm:"column:destination_product_id;not null" json:"destination_product_id"`
	Quantity             int       `gorm:"column:quantity;not null" json:"quantity"`
	CreatedBy            uint      `gorm:"column:created_by;not null" json:"created_by"`
	CreatedAt            time.Time `gorm:"column:created_at;autoCreateTime;index" json:"created_at"`
}

func (InventoryTransfer) TableName() string { return "inventory_transfers" }
