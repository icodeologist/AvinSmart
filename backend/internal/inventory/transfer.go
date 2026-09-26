package inventory

import (
	"errors"
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/outletaccess"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type transferRequest struct {
	SourceOutletID      uint `json:"source_outlet_id"`
	DestinationOutletID uint `json:"destination_outlet_id"`
	ProductID           uint `json:"product_id"`
	Quantity            int  `json:"quantity"`
}

func Transfer(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var payload transferRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if payload.SourceOutletID == 0 || payload.DestinationOutletID == 0 || payload.ProductID == 0 || payload.Quantity <= 0 {
			api.WriteError(w, http.StatusBadRequest, "source_outlet_id, destination_outlet_id, product_id, and quantity must be positive")
			return
		}
		if payload.SourceOutletID == payload.DestinationOutletID {
			api.WriteError(w, http.StatusBadRequest, "source and destination outlets must differ")
			return
		}
		for _, outletID := range []uint{payload.SourceOutletID, payload.DestinationOutletID} {
			allowed, err := outletaccess.CanAccess(db, principal, outletID)
			if err != nil {
				api.WriteError(w, http.StatusInternalServerError, "could not check outlet access")
				return
			}
			if !allowed {
				api.WriteError(w, http.StatusForbidden, "you do not have access to both transfer outlets")
				return
			}
		}

		var transfer models.InventoryTransfer
		err := db.Transaction(func(tx *gorm.DB) error {
			var source models.Product
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND outlet_id = ?", payload.ProductID, payload.SourceOutletID).First(&source).Error; err != nil {
				return err
			}
			if source.Quantity < payload.Quantity {
				return errors.New("insufficient stock for transfer")
			}

			var destination models.Product
			destinationQuery := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("outlet_id = ? AND sku_id = ?", payload.DestinationOutletID, source.SKUID).First(&destination)
			if errors.Is(destinationQuery.Error, gorm.ErrRecordNotFound) {
				destination = source
				destination.ID = 0
				destination.OutletID = payload.DestinationOutletID
				destination.Quantity = 0
				destination.Outlet = models.Outlet{}
				destination.Category = models.Category{}
				destination.SubCategory = models.SubCategory{}
				if err := tx.Create(&destination).Error; err != nil {
					return err
				}
			} else if destinationQuery.Error != nil {
				return destinationQuery.Error
			}

			if err := tx.Model(&source).UpdateColumn("quantity", gorm.Expr("quantity - ?", payload.Quantity)).Error; err != nil {
				return err
			}
			if err := tx.Model(&destination).UpdateColumn("quantity", gorm.Expr("quantity + ?", payload.Quantity)).Error; err != nil {
				return err
			}

			actorID := principal.UserID
			transfer = models.InventoryTransfer{SourceOutletID: payload.SourceOutletID, DestinationOutletID: payload.DestinationOutletID, SourceProductID: source.ID, DestinationProductID: destination.ID, Quantity: payload.Quantity, CreatedBy: actorID}
			if err := tx.Create(&transfer).Error; err != nil {
				return err
			}
			if err := Record(tx, source, -payload.Quantity, ReasonTransferOut, &actorID, "inventory_transfer", transfer.ID); err != nil {
				return err
			}
			if err := Record(tx, destination, payload.Quantity, ReasonTransferIn, &actorID, "inventory_transfer", transfer.ID); err != nil {
				return err
			}
			return nil
		})
		if err != nil {
			status := http.StatusInternalServerError
			message := "could not transfer inventory"
			if errors.Is(err, gorm.ErrRecordNotFound) || strings.Contains(err.Error(), "insufficient stock") {
				status = http.StatusConflict
				message = err.Error()
			}
			api.WriteError(w, status, message)
			return
		}
		api.WriteSuccess(w, http.StatusCreated, transfer)
	}
}
