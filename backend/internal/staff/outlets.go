package staff

import (
	"errors"
	"fmt"

	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

var errOutletAssignment = errors.New("one or more outlet assignments are invalid")

func requiresOutlet(role string) bool {
	return role == "sales" || role == "inventory_staff"
}

func loadActiveOutlets(db *gorm.DB, ids []uint) ([]models.Outlet, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	seen := make(map[uint]struct{}, len(ids))
	for _, id := range ids {
		if id == 0 {
			return nil, fmt.Errorf("%w: outlet ids must be positive", errOutletAssignment)
		}
		if _, ok := seen[id]; ok {
			return nil, fmt.Errorf("%w: duplicate outlet id %d", errOutletAssignment, id)
		}
		seen[id] = struct{}{}
	}

	var outlets []models.Outlet
	if err := db.Where("id IN ? AND status = ?", ids, "active").Find(&outlets).Error; err != nil {
		return nil, err
	}
	if len(outlets) != len(ids) {
		return nil, fmt.Errorf("%w: all outlets must exist and be active", errOutletAssignment)
	}
	return outlets, nil
}
