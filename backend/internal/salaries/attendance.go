package salaries

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var attendanceStatuses = map[string]bool{"present": true, "absent": true, "holiday": true, "not-marked": true}

func monthFilter(r *http.Request) (string, error) {
	month := strings.TrimSpace(r.URL.Query().Get("month"))
	if month == "" {
		return "", errors.New("month is required and must use YYYY-MM format")
	}
	return month, validatePayPeriod(month)
}

func ListAttendance(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := principal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		month, err := monthFilter(r)
		if err != nil {
			api.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}
		query, err := applyStaffScope(db, actor, db.Preload("Staff").Where("date >= ? AND date < ?", month+"-01", nextMonth(month)))
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not check staff access")
			return
		}
		if staffID := strings.TrimSpace(r.URL.Query().Get("staff_id")); staffID != "" {
			var id uint
			if _, scanErr := fmt.Sscan(staffID, &id); scanErr != nil || id == 0 {
				api.WriteError(w, http.StatusBadRequest, "staff_id must be a positive integer")
				return
			}
			if _, err := authorizeStaff(db, actor, id); err != nil {
				writeStaffAccessError(w, err)
				return
			}
			query = query.Where("staff_id = ?", id)
		}
		var records []models.Attendance
		if err := query.Order("date asc").Find(&records).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch attendance")
			return
		}
		api.WriteSuccess(w, http.StatusOK, records)
	}
}

type attendanceRequest struct {
	StaffID uint   `json:"staff_id"`
	Date    string `json:"date"`
	Status  string `json:"status"`
	Note    string `json:"note"`
}

func (p *attendanceRequest) validate() api.Fields {
	fields := api.NewFields()
	p.Date = strings.TrimSpace(p.Date)
	p.Status = strings.TrimSpace(strings.ToLower(p.Status))
	if p.StaffID == 0 {
		fields.Add("staff_id", "staff_id is required")
	}
	if _, err := parseDate(p.Date); err != nil {
		fields.Add("date", err.Error())
	}
	if !attendanceStatuses[p.Status] {
		fields.Add("status", "status must be present, absent, holiday, or not-marked")
	}
	return fields
}

func UpsertAttendance(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := principal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var payload attendanceRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid attendance", fields)
			return
		}
		if payload.Date > currentDateUTC() {
			api.WriteError(w, http.StatusBadRequest, "attendance cannot be recorded for a future date")
			return
		}
		if _, err := authorizeStaff(db, actor, payload.StaffID); err != nil {
			writeStaffAccessError(w, err)
			return
		}

		var record models.Attendance
		err := db.Transaction(func(tx *gorm.DB) error {
			query := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("staff_id = ? AND date = ?", payload.StaffID, payload.Date).First(&record)
			if errors.Is(query.Error, gorm.ErrRecordNotFound) {
				record = models.Attendance{StaffID: payload.StaffID, Date: payload.Date}
			} else if query.Error != nil {
				return query.Error
			}
			before := record
			record.Status, record.Note, record.UpdatedByID = payload.Status, strings.TrimSpace(payload.Note), &actor.UserID
			if err := tx.Save(&record).Error; err != nil {
				return err
			}
			return recordAudit(tx, "attendance", record.ID, "upserted", actor.UserID, before, record)
		})
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not save attendance")
			return
		}
		db.Preload("Staff").First(&record, record.ID)
		api.WriteSuccess(w, http.StatusOK, record)
	}
}

func nextMonth(period string) string {
	value, err := time.Parse("2006-01", period)
	if err != nil {
		return period + "-32"
	}
	return value.AddDate(0, 1, 0).Format("2006-01-02")
}
