package outletaccess

import (
	"errors"
	"fmt"

	"avinsmart/backend/internal/auth"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

var (
	ErrOutletRequired  = errors.New("outlet_id is required")
	ErrOutletForbidden = errors.New("you do not have access to this outlet")
	ErrOutletNotFound  = errors.New("outlet not found")
)

// AllowedOutletIDs returns nil for a principal with explicit global access.
// An empty, non-nil slice means the staff member has no outlet assignment.
// Assignments are read from the database instead of copied into the JWT, so a
// permission change takes effect on the next authorized request.
func AllowedOutletIDs(db *gorm.DB, principal auth.Principal) ([]uint, error) {
	if principal.UserType == "admin" || principal.Role == "admin" {
		return nil, nil
	}

	var assignments []models.StaffOutlet
	if err := db.Where("staff_id = ?", principal.UserID).Find(&assignments).Error; err != nil {
		return nil, err
	}
	ids := make([]uint, 0, len(assignments))
	for _, assignment := range assignments {
		ids = append(ids, assignment.OutletID)
	}
	return ids, nil
}

func CanAccess(db *gorm.DB, principal auth.Principal, outletID uint) (bool, error) {
	if outletID == 0 {
		return false, ErrOutletRequired
	}
	ids, err := AllowedOutletIDs(db, principal)
	if err != nil {
		return false, err
	}
	if ids == nil {
		return true, nil
	}
	for _, id := range ids {
		if id == outletID {
			return true, nil
		}
	}
	return false, ErrOutletForbidden
}

// Resolve validates a requested outlet, or selects the only assigned outlet
// for a single-outlet staff member. Global users must choose explicitly.
func Resolve(db *gorm.DB, principal auth.Principal, requested *uint) (uint, error) {
	ids, err := AllowedOutletIDs(db, principal)
	if err != nil {
		return 0, err
	}
	if requested == nil || *requested == 0 {
		if len(ids) == 1 {
			return ids[0], nil
		}
		return 0, ErrOutletRequired
	}

	allowed, err := CanAccess(db, principal, *requested)
	if err != nil {
		return 0, err
	}
	if !allowed {
		return 0, ErrOutletForbidden
	}

	var outlet models.Outlet
	if err := db.Select("id").First(&outlet, *requested).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, ErrOutletNotFound
		}
		return 0, err
	}
	if outlet.Status != "active" {
		return 0, fmt.Errorf("outlet is not active")
	}
	return *requested, nil
}

func WhereAllowed(db *gorm.DB, principal auth.Principal, query *gorm.DB, column string) (*gorm.DB, error) {
	ids, err := AllowedOutletIDs(db, principal)
	if err != nil {
		return nil, err
	}
	if ids == nil {
		return query, nil
	}
	if len(ids) == 0 {
		return query.Where("1 = 0"), nil
	}
	return query.Where(column+" IN ?", ids), nil
}

func ValidateAssignments(db *gorm.DB, principal auth.Principal, outletIDs []uint) error {
	for _, outletID := range outletIDs {
		allowed, err := CanAccess(db, principal, outletID)
		if err != nil {
			return err
		}
		if !allowed {
			return ErrOutletForbidden
		}
	}
	return nil
}
