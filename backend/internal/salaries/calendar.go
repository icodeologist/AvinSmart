package salaries

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
	err := db.Preload("PublicHolidays").Where("pay_period = ?", period).First(&calendar).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		calendar = models.PayrollCalendar{PayPeriod: period, WorkingDays: defaultWorkingDays(period)}
		if err := db.Create(&calendar).Error; err != nil {
			return calendar, err
		}
		return calendar, db.Preload("PublicHolidays").First(&calendar, calendar.ID).Error
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
		db.Preload("PublicHolidays").First(&calendar, calendar.ID)
		api.WriteSuccess(w, http.StatusOK, calendar)
	}
}

type holidayRequest struct {
	PayPeriod string `json:"pay_period"`
	Date      string `json:"date"`
	Name      string `json:"name"`
}

func AddHoliday(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := principal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var payload holidayRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		payload.PayPeriod, payload.Date, payload.Name = strings.TrimSpace(payload.PayPeriod), strings.TrimSpace(payload.Date), strings.TrimSpace(payload.Name)
		if err := validatePayPeriod(payload.PayPeriod); err != nil {
			api.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		if _, err := parseDate(payload.Date); err != nil || !dateInPeriod(payload.Date, payload.PayPeriod) || payload.Name == "" {
			api.WriteError(w, http.StatusBadRequest, "date must belong to pay_period and name is required")
			return
		}
		calendar, err := getCalendar(db, payload.PayPeriod)
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not load payroll calendar")
			return
		}
		holiday := models.PublicHoliday{CalendarID: calendar.ID, Date: payload.Date, Name: payload.Name}
		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&holiday).Error; err != nil {
				return err
			}
			if weekday, _ := parseDate(payload.Date); weekday.Weekday() != time.Saturday && weekday.Weekday() != time.Sunday {
				calendar.WorkingDays--
				if calendar.WorkingDays < 1 {
					return errors.New("calendar must retain at least one working day")
				}
				if err := tx.Save(&calendar).Error; err != nil {
					return err
				}
			}
			return recordAudit(tx, "holiday", holiday.ID, "created", actor.UserID, nil, holiday)
		})
		if err != nil {
			if api.IsUniqueViolation(err) {
				api.WriteError(w, http.StatusConflict, "a public holiday already exists for this date")
				return
			}
			api.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		api.WriteSuccess(w, http.StatusCreated, holiday)
	}
}

func DeleteHoliday(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := principal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var holiday models.PublicHoliday
		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&holiday, chi.URLParam(r, "id")).Error; err != nil {
				return err
			}
			var calendar models.PayrollCalendar
			if err := tx.First(&calendar, holiday.CalendarID).Error; err != nil {
				return err
			}
			before := holiday
			if err := tx.Delete(&holiday).Error; err != nil {
				return err
			}
			if date, _ := parseDate(holiday.Date); date.Weekday() != time.Saturday && date.Weekday() != time.Sunday {
				calendar.WorkingDays++
				if err := tx.Save(&calendar).Error; err != nil {
					return err
				}
			}
			return recordAudit(tx, "holiday", before.ID, "deleted", actor.UserID, before, nil)
		})
		if errors.Is(err, gorm.ErrRecordNotFound) {
			api.WriteError(w, http.StatusNotFound, "public holiday not found")
			return
		}
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not delete public holiday")
			return
		}
		api.WriteSuccess(w, http.StatusOK, map[string]bool{"deleted": true})
	}
}
