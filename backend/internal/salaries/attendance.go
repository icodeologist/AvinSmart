package salaries

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/outletaccess"

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

type bulkAttendanceEntry struct {
	StaffID uint   `json:"staff_id"`
	Status  string `json:"status"`
	Note    string `json:"note"`
}

type bulkAttendanceRequest struct {
	Date    string                `json:"date"`
	Entries []bulkAttendanceEntry `json:"entries"`
}

func (p *bulkAttendanceRequest) validate() api.Fields {
	fields := api.NewFields()
	p.Date = strings.TrimSpace(p.Date)
	if _, err := parseDate(p.Date); err != nil {
		fields.Add("date", err.Error())
	}
	if len(p.Entries) == 0 {
		fields.Add("entries", "at least one staff attendance entry is required")
		return fields
	}
	seen := make(map[uint]bool, len(p.Entries))
	for index := range p.Entries {
		entry := &p.Entries[index]
		entry.Status = strings.TrimSpace(strings.ToLower(entry.Status))
		entry.Note = strings.TrimSpace(entry.Note)
		if entry.StaffID == 0 {
			fields.Add(fmt.Sprintf("entries.%d.staff_id", index), "staff_id is required")
		}
		if seen[entry.StaffID] {
			fields.Add(fmt.Sprintf("entries.%d.staff_id", index), "staff_id must appear only once")
		}
		seen[entry.StaffID] = true
		if !attendanceStatuses[entry.Status] {
			fields.Add(fmt.Sprintf("entries.%d.status", index), "status must be present, absent, holiday, or not-marked")
		}
	}
	return fields
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
		if payload.Date > currentBusinessDate() {
			api.WriteError(w, http.StatusBadRequest, "attendance cannot be recorded for a future date")
			return
		}
		if _, err := authorizeStaff(db, actor, payload.StaffID); err != nil {
			writeStaffAccessError(w, err)
			return
		}

		var record models.Attendance
		err := db.Transaction(func(tx *gorm.DB) error {
			var before models.Attendance
			var err error
			record, before, err = upsertAttendance(tx, actor.UserID, payload.StaffID, payload.Date, payload.Status, payload.Note)
			if err != nil {
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

// BulkUpsertAttendance records one day's attendance for all selected staff in
// a single transaction so a daily register cannot be partially saved.
func BulkUpsertAttendance(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := principal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}

		var payload bulkAttendanceRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid attendance", fields)
			return
		}
		if payload.Date > currentBusinessDate() {
			api.WriteError(w, http.StatusBadRequest, "attendance cannot be recorded for a future date")
			return
		}

		records := make([]models.Attendance, 0, len(payload.Entries))
		err := db.Transaction(func(tx *gorm.DB) error {
			for _, entry := range payload.Entries {
				if _, err := authorizeStaff(tx, actor, entry.StaffID); err != nil {
					return err
				}
				record, before, err := upsertAttendance(tx, actor.UserID, entry.StaffID, payload.Date, entry.Status, entry.Note)
				if err != nil {
					return err
				}
				if err := recordAudit(tx, "attendance", record.ID, "upserted", actor.UserID, before, record); err != nil {
					return err
				}
				records = append(records, record)
			}
			return nil
		})
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) || errors.Is(err, outletaccess.ErrOutletForbidden) {
				writeStaffAccessError(w, err)
				return
			}
			api.WriteError(w, http.StatusInternalServerError, "could not save daily attendance")
			return
		}
		for index := range records {
			db.Preload("Staff").First(&records[index], records[index].ID)
		}
		api.WriteSuccess(w, http.StatusOK, records)
	}
}

func upsertAttendance(tx *gorm.DB, actorID, staffID uint, date, status, note string) (models.Attendance, models.Attendance, error) {
	var before models.Attendance
	if err := tx.Where("staff_id = ? AND date = ?", staffID, date).Limit(1).Find(&before).Error; err != nil {
		return models.Attendance{}, before, err
	}

	record := models.Attendance{
		StaffID:     staffID,
		Date:        date,
		Status:      status,
		Note:        strings.TrimSpace(note),
		UpdatedByID: &actorID,
	}
	err := tx.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "staff_id"}, {Name: "date"}},
		DoUpdates: clause.AssignmentColumns([]string{"status", "note", "updated_by_id", "updated_at"}),
	}).Create(&record).Error
	if err != nil {
		return models.Attendance{}, before, err
	}
	if err := tx.Where("staff_id = ? AND date = ?", staffID, date).First(&record).Error; err != nil {
		return models.Attendance{}, before, err
	}
	return record, before, nil
}

func nextMonth(period string) string {
	value, err := time.Parse("2006-01", period)
	if err != nil {
		return period + "-32"
	}
	return value.AddDate(0, 1, 0).Format("2006-01-02")
}
