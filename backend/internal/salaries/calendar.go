package salaries

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

func defaultWorkingDays(period string) int {
	start, err := time.Parse("2006-01", period)
	if err != nil {
		return 0
	}
	days := 0
	for date := start; date.Month() == start.Month(); date = date.AddDate(0, 0, 1) {
		if date.Weekday() != time.Saturday && date.Weekday() != time.Sunday {
			days++
		}
	}
	return days
}

func getCalendar(db *gorm.DB, period string) (models.PayrollCalendar, error) {
	var calendar models.PayrollCalendar
	err := db.Where("pay_period = ?", period).First(&calendar).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		calendar = models.PayrollCalendar{PayPeriod: period, WorkingDays: defaultWorkingDays(period)}
		if err := db.Create(&calendar).Error; err != nil {
			return calendar, err
		}
		return calendar, db.First(&calendar, calendar.ID).Error
	}
	return calendar, err
}

func Calendar(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		period := strings.TrimSpace(r.URL.Query().Get("pay_period"))
		if err := validatePayPeriod(period); err != nil {
			api.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		calendar, err := getCalendar(db, period)
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not load payroll calendar")
			return
		}
		api.WriteSuccess(w, http.StatusOK, calendar)
	}
}

type calendarRequest struct {
	PayPeriod   string `json:"pay_period"`
	WorkingDays int    `json:"working_days"`
}

func UpdateCalendar(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := principal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var payload calendarRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		payload.PayPeriod = strings.TrimSpace(payload.PayPeriod)
		if err := validatePayPeriod(payload.PayPeriod); err != nil || payload.WorkingDays <= 0 || payload.WorkingDays > 31 {
			api.WriteError(w, http.StatusBadRequest, "pay_period must use YYYY-MM format and working_days must be between 1 and 31")
			return
		}
		calendar, err := getCalendar(db, payload.PayPeriod)
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not load payroll calendar")
			return
		}
		before := calendar
		calendar.WorkingDays = payload.WorkingDays
		if err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Save(&calendar).Error; err != nil {
				return err
			}
			return recordAudit(tx, "calendar", calendar.ID, "updated", actor.UserID, before, calendar)
		}); err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not update payroll calendar")
			return
		}
		api.WriteSuccess(w, http.StatusOK, calendar)
	}
}
