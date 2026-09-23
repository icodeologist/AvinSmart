package salaries

import (
	"errors"
	"net/http"
	"regexp"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

var datePattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
var attendanceStatuses = map[string]bool{"present": true, "absent": true, "holiday": true, "not-marked": true}
var leaveStatuses = map[string]bool{"pending": true, "approved": true, "declined": true}

func staffExists(db *gorm.DB, staffID uint) error {
	var member models.Staff
	if err := db.First(&member, staffID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return gorm.ErrRecordNotFound
		}
		return err
	}
	return nil
}

func ListAttendance(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		staffID := r.URL.Query().Get("staff_id")
		month := strings.TrimSpace(r.URL.Query().Get("month"))
		query := db.Preload("Staff").Order("date asc")
		if staffID != "" {
			query = query.Where("staff_id = ?", staffID)
		}
		if month != "" {
			query = query.Where("CAST(date AS TEXT) LIKE ?", month+"-%")
		}
		var records []models.Attendance
		if err := query.Find(&records).Error; err != nil {
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
	f := api.NewFields()
	p.Date = strings.TrimSpace(p.Date)
	p.Status = strings.TrimSpace(strings.ToLower(p.Status))
	if p.StaffID == 0 {
		f.Add("staff_id", "staff_id is required")
	}
	if !datePattern.MatchString(p.Date) {
		f.Add("date", "date must use YYYY-MM-DD format")
	}
	if !attendanceStatuses[p.Status] {
		f.Add("status", "status must be present, absent, holiday, or not-marked")
	}
	return f
}

func UpsertAttendance(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload attendanceRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		if fields := payload.validate(); fields.HasErrors() {
			api.WriteValidation(w, "invalid attendance", fields)
			return
		}
		if err := staffExists(db, payload.StaffID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				api.WriteError(w, http.StatusNotFound, "staff member not found")
			} else {
				api.WriteError(w, http.StatusInternalServerError, "could not find staff member")
			}
			return
		}
		var record models.Attendance
		err := db.Where("staff_id = ? AND date = ?", payload.StaffID, payload.Date).First(&record).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			record = models.Attendance{StaffID: payload.StaffID, Date: payload.Date}
		} else if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not find attendance")
			return
		}
		record.Status, record.Note = payload.Status, strings.TrimSpace(payload.Note)
		if err := db.Save(&record).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not save attendance")
			return
		}
		db.Preload("Staff").First(&record, record.ID)
		api.WriteSuccess(w, http.StatusOK, record)
	}
}

func ListLeaveRequests(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := db.Preload("Staff").Order("date asc, created_at desc")
		if staffID := r.URL.Query().Get("staff_id"); staffID != "" {
			query = query.Where("staff_id = ?", staffID)
		}
		if month := strings.TrimSpace(r.URL.Query().Get("month")); month != "" {
			query = query.Where("CAST(date AS TEXT) LIKE ?", month+"-%")
		}
		var records []models.LeaveRequest
		if err := query.Find(&records).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch leave requests")
			return
		}
		api.WriteSuccess(w, http.StatusOK, records)
	}
}

type leaveRequestPayload struct {
	StaffID uint   `json:"staff_id"`
	Date    string `json:"date"`
	Reason  string `json:"reason"`
}

func CreateLeaveRequest(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload leaveRequestPayload
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		fields := api.NewFields()
		payload.Date, payload.Reason = strings.TrimSpace(payload.Date), strings.TrimSpace(payload.Reason)
		if payload.StaffID == 0 {
			fields.Add("staff_id", "staff_id is required")
		}
		if !datePattern.MatchString(payload.Date) {
			fields.Add("date", "date must use YYYY-MM-DD format")
		}
		if payload.Reason == "" {
			fields.Add("reason", "reason is required")
		}
		if fields.HasErrors() {
			api.WriteValidation(w, "invalid leave request", fields)
			return
		}
		if err := staffExists(db, payload.StaffID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				api.WriteError(w, http.StatusNotFound, "staff member not found")
			} else {
				api.WriteError(w, http.StatusInternalServerError, "could not find staff member")
			}
			return
		}
		record := models.LeaveRequest{StaffID: payload.StaffID, Date: payload.Date, Reason: payload.Reason, Status: "pending"}
		if err := db.Create(&record).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not create leave request")
			return
		}
		db.Preload("Staff").First(&record, record.ID)
		api.WriteSuccess(w, http.StatusCreated, record)
	}
}

type leaveStatusPayload struct {
	Status string `json:"status"`
}

func UpdateLeaveRequest(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload leaveStatusPayload
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		payload.Status = strings.TrimSpace(strings.ToLower(payload.Status))
		if !leaveStatuses[payload.Status] {
			api.WriteError(w, http.StatusBadRequest, "status must be pending, approved, or declined")
			return
		}
		var record models.LeaveRequest
		if err := db.First(&record, chi.URLParam(r, "id")).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				api.WriteError(w, http.StatusNotFound, "leave request not found")
			} else {
				api.WriteError(w, http.StatusInternalServerError, "could not find leave request")
			}
			return
		}
		record.Status = payload.Status
		if err := db.Save(&record).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not update leave request")
			return
		}
		db.Preload("Staff").First(&record, record.ID)
		api.WriteSuccess(w, http.StatusOK, record)
	}
}
