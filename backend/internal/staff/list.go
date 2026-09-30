package staff

import (
	"net/http"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/outletaccess"

	"gorm.io/gorm"
)

type attendanceSummary struct {
	Month       string `json:"month"`
	PresentDays int64  `json:"present_days"`
	AbsentDays  int64  `json:"absent_days"`
}

type staffListItem struct {
	models.Staff
	Attendance attendanceSummary `json:"attendance"`
}

type attendanceCount struct {
	StaffID     uint
	PresentDays int64
	AbsentDays  int64
}

func List(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		month := strings.TrimSpace(r.URL.Query().Get("attendance_month"))
		if month == "" {
			month = time.Now().UTC().Format("2006-01")
		}
		start, parseErr := time.Parse("2006-01", month)
		if parseErr != nil || start.Format("2006-01") != month {
			api.WriteError(w, http.StatusBadRequest, "attendance_month must use YYYY-MM format")
			return
		}

		var members []models.Staff
		query := db.Preload("Outlets")
		ids, err := outletaccess.AllowedOutletIDs(db, principal)
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not check staff outlet access")
			return
		}
		if ids != nil {
			if len(ids) == 0 {
				query = query.Where("1 = 0")
			} else {
				query = query.Where("id IN (SELECT staff_id FROM staff_outlets WHERE outlet_id IN ?)", ids)
			}
		}
		if err := query.Order("created_at desc").Find(&members).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch staff")
			return
		}

		var counts []attendanceCount
		if err := db.Model(&models.Attendance{}).
			Select("staff_id, SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_days, SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_days").
			Where("date >= ? AND date < ?", start.Format("2006-01-02"), start.AddDate(0, 1, 0).Format("2006-01-02")).
			Group("staff_id").
			Scan(&counts).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch attendance summary")
			return
		}
		byStaffID := make(map[uint]attendanceCount, len(counts))
		for _, count := range counts {
			byStaffID[count.StaffID] = count
		}
		items := make([]staffListItem, 0, len(members))
		for _, member := range members {
			count := byStaffID[member.ID]
			items = append(items, staffListItem{Staff: member, Attendance: attendanceSummary{Month: month, PresentDays: count.PresentDays, AbsentDays: count.AbsentDays}})
		}

		api.WriteSuccess(w, http.StatusOK, items)
	}
}
