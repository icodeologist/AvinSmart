package salaries

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/auth"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/outletaccess"

	"gorm.io/gorm"
)

var payPeriodPattern = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])$`)
var datePattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
var approvedCurrencies = map[string]bool{"INR": true, "USD": true, "EUR": true, "GBP": true}

func validatePayPeriod(value string) error {
	if !payPeriodPattern.MatchString(value) {
		return errors.New("pay_period must use YYYY-MM format")
	}
	return nil
}

func parseDate(value string) (time.Time, error) {
	if !datePattern.MatchString(value) {
		return time.Time{}, errors.New("date must use YYYY-MM-DD format")
	}
	return time.Parse("2006-01-02", value)
}

func currentDateUTC() string { return time.Now().UTC().Format("2006-01-02") }

func dateInPeriod(date, period string) bool { return strings.HasPrefix(date, period+"-") }

func principal(r *http.Request) (auth.Principal, bool) {
	return middleware.PrincipalFromContext(r.Context())
}

func isGlobal(principal auth.Principal) bool {
	return principal.UserType == "admin" || principal.Role == "admin"
}

func authorizeStaff(db *gorm.DB, principal auth.Principal, staffID uint) (models.Staff, error) {
	var member models.Staff
	if err := db.Preload("Outlets").First(&member, staffID).Error; err != nil {
		return member, err
	}
	if isGlobal(principal) {
		return member, nil
	}
	allowed, err := outletaccess.AllowedOutletIDs(db, principal)
	if err != nil {
		return member, err
	}
	for _, staffOutlet := range member.Outlets {
		for _, allowedOutlet := range allowed {
			if staffOutlet.ID == allowedOutlet {
				return member, nil
			}
		}
	}
	return member, outletaccess.ErrOutletForbidden
}

func applyStaffScope(db *gorm.DB, principal auth.Principal, query *gorm.DB) (*gorm.DB, error) {
	if isGlobal(principal) {
		return query, nil
	}
	ids, err := outletaccess.AllowedOutletIDs(db, principal)
	if err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return query.Where("1 = 0"), nil
	}
	return query.Where("id IN (SELECT staff_id FROM staff_outlets WHERE outlet_id IN ?)", ids), nil
}

func writeStaffAccessError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		api.WriteError(w, http.StatusNotFound, "staff member not found")
	case errors.Is(err, outletaccess.ErrOutletForbidden):
		api.WriteError(w, http.StatusForbidden, "you do not manage this staff member")
	default:
		api.WriteError(w, http.StatusInternalServerError, "could not check staff access")
	}
}

func recordAudit(tx *gorm.DB, entity string, entityID uint, action string, actorID uint, before, after any) error {
	beforeJSON, err := json.Marshal(before)
	if err != nil {
		return err
	}
	afterJSON, err := json.Marshal(after)
	if err != nil {
		return err
	}
	return tx.Create(&models.PayrollAudit{Entity: entity, EntityID: entityID, Action: action, ActorID: actorID, Before: string(beforeJSON), After: string(afterJSON)}).Error
}

func validCurrency(value string) bool { return approvedCurrencies[value] }

func currencyError() string {
	return fmt.Sprintf("currency must be one of: %s", strings.Join([]string{"INR", "USD", "EUR", "GBP"}, ", "))
}

func ensurePeriodCurrency(db *gorm.DB, period, currency string, excludeID uint) error {
	query := db.Where("pay_period = ? AND currency <> ?", period, currency)
	if excludeID != 0 {
		query = query.Where("id <> ?", excludeID)
	}
	var existing models.Salary
	if err := query.First(&existing).Error; err == nil {
		return fmt.Errorf("all salary records for %s must use %s", period, existing.Currency)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return nil
}
