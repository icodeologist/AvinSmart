package salaries

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var leaveStatuses = map[string]bool{"pending": true, "approved": true, "declined": true}

func ListLeaveRequests(db *gorm.DB) http.HandlerFunc {
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
		if value := strings.TrimSpace(r.URL.Query().Get("staff_id")); value != "" {
			id, parseErr := parsePositiveUint(value)
			if parseErr != nil {
				api.WriteError(w, http.StatusBadRequest, parseErr.Error())
				return
			}
			if _, err := authorizeStaff(db, actor, id); err != nil {
				writeStaffAccessError(w, err)
				return
			}
			query = query.Where("staff_id = ?", id)
		}
		var records []models.LeaveRequest
		if err := query.Order("date asc, created_at desc").Find(&records).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch leave requests")
			return
		}
		api.WriteSuccess(w, http.StatusOK, records)
	}
}

type leaveRequestPayload struct {
	PayPeriod string `json:"pay_period"`
	StaffID   uint   `json:"staff_id"`
	Date      string `json:"date"`
	Reason    string `json:"reason"`
}

func CreateLeaveRequest(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := principal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var payload leaveRequestPayload
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		payload.PayPeriod, payload.Date, payload.Reason = strings.TrimSpace(payload.PayPeriod), strings.TrimSpace(payload.Date), strings.TrimSpace(payload.Reason)
		fields := api.NewFields()
		if err := validatePayPeriod(payload.PayPeriod); err != nil {
			fields.Add("pay_period", err.Error())
		}
		if payload.StaffID == 0 {
			fields.Add("staff_id", "staff_id is required")
		}
		if _, err := parseDate(payload.Date); err != nil {
			fields.Add("date", err.Error())
		} else if !dateInPeriod(payload.Date, payload.PayPeriod) {
			fields.Add("date", "date must belong to pay_period")
		}
		if payload.Reason == "" {
			fields.Add("reason", "reason is required")
		}
		if fields.HasErrors() {
			api.WriteValidation(w, "invalid leave request", fields)
			return
		}
		if payload.Date > currentDateUTC() {
			api.WriteError(w, http.StatusBadRequest, "leave cannot be requested for a future date")
			return
		}
		if _, err := authorizeStaff(db, actor, payload.StaffID); err != nil {
			writeStaffAccessError(w, err)
			return
		}

		record := models.LeaveRequest{StaffID: payload.StaffID, Date: payload.Date, Reason: payload.Reason, Status: "pending"}
		if err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&record).Error; err != nil {
				return err
			}
			return recordAudit(tx, "leave", record.ID, "created", actor.UserID, nil, record)
		}); err != nil {
			if api.IsUniqueViolation(err) {
				api.WriteError(w, http.StatusConflict, "a leave request already exists for this staff member and date")
				return
			}
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
		actor, ok := principal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var payload leaveStatusPayload
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		payload.Status = strings.ToLower(strings.TrimSpace(payload.Status))
		if !leaveStatuses[payload.Status] || payload.Status == "pending" {
			api.WriteError(w, http.StatusBadRequest, "status must be approved or declined")
			return
		}

		var record models.LeaveRequest
		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&record, chi.URLParam(r, "id")).Error; err != nil {
				return err
			}
			if _, err := authorizeStaff(tx, actor, record.StaffID); err != nil {
				return err
			}
			if record.Status != "pending" {
				return errors.New("leave request has already been reviewed")
			}
			before := record
			now := time.Now().UTC()
			record.Status, record.ReviewedByID, record.ReviewedAt = payload.Status, &actor.UserID, &now
			if err := tx.Save(&record).Error; err != nil {
				return err
			}
			return recordAudit(tx, "leave", record.ID, payload.Status, actor.UserID, before, record)
		})
		if err != nil {
			switch {
			case errors.Is(err, gorm.ErrRecordNotFound):
				api.WriteError(w, http.StatusNotFound, "leave request not found")
			case strings.Contains(err.Error(), "already been reviewed"):
				api.WriteError(w, http.StatusConflict, err.Error())
			default:
				writeStaffAccessError(w, err)
			}
			return
		}
		db.Preload("Staff").First(&record, record.ID)
		api.WriteSuccess(w, http.StatusOK, record)
	}
}

func parsePositiveUint(value string) (uint, error) {
	var id uint
	if _, err := fmt.Sscan(value, &id); err != nil || id == 0 {
		return 0, errors.New("id must be a positive integer")
	}
	return id, nil
}
