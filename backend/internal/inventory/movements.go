package inventory

import (
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

const (
	ReasonOpening      = "opening_stock"
	ReasonSale         = "sale"
	ReasonSaleReversal = "sale_reversal"
	ReasonRefund       = "refund"
	ReasonTransferOut  = "transfer_out"
	ReasonTransferIn   = "transfer_in"
)

func Record(tx *gorm.DB, product models.Product, delta int, reason string, actorID *uint, referenceType string, referenceID uint) error {
	if delta == 0 {
		return nil
	}
	var refID *uint
	if referenceID != 0 {
		refID = &referenceID
	}
	return tx.Create(&models.InventoryMovement{
		OutletID:      product.OutletID,
		ProductID:     product.ID,
		QuantityDelta: delta,
		Reason:        reason,
		ActorID:       actorID,
		ReferenceType: referenceType,
		ReferenceID:   refID,
	}).Error
}
