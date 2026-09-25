package salaries

import (
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type payrollSummaryEntry struct {
	StaffID       uint         `json:"staff_id"`
	Name          string       `json:"name"`
	Role          string       `json:"role"`
	SalaryID      uint         `json:"salary_id,omitempty"`
	MonthlyAmount money.Amount `json:"monthly_amount"`
	Currency      string       `json:"currency"`
	Status        string       `json:"status"`
	PresentDays   int          `json:"present_days"`
	AbsentDays    int          `json:"absent_days"`
	PaidLeaveDays int          `json:"paid_leave_days"`
	PayableDays   int          `json:"payable_days"`
	PayableAmount money.Amount `json:"payable_amount"`
}

type payrollSummary struct {
	PayPeriod      string                 `json:"pay_period"`
	WorkingDays    int                    `json:"working_days"`
	PublicHolidays []models.PublicHoliday `json:"public_holidays"`
	Records        []payrollSummaryEntry  `json:"records"`
	TotalPayable   money.Amount           `json:"total_payable"`
}

func payableAmount(monthly money.Amount, payableDays, workingDays int) money.Amount {
	if monthly.IsZero() || payableDays <= 0 || workingDays <= 0 {
		return money.Zero()
	}
	value := monthly.Decimal.Mul(decimal.NewFromInt(int64(payableDays))).Div(decimal.NewFromInt(int64(workingDays))).Round(2)
	amount, err := money.FromDecimal(value)
	if err != nil {
		return money.Zero()
	}
	return amount
}

func Summary(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, ok := principal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		period := strings.TrimSpace(r.URL.Query().Get("pay_period"))
		if err := validatePayPeriod(period); err != nil {
			api.WriteError(w, http.StatusBadRequest, err.Error())
			return
		}

		result := payrollSummary{TotalPayable: money.Zero()}
		err := db.Transaction(func(tx *gorm.DB) error {
			calendar, err := getCalendar(tx, period)
			if err != nil {
				return err
			}
			result.PayPeriod, result.WorkingDays, result.PublicHolidays = period, calendar.WorkingDays, calendar.PublicHolidays

			staffQuery, err := applyStaffScope(tx, actor, tx.Order("name asc"))
			if err != nil {
				return err
			}
			var members []models.Staff
			if err := staffQuery.Find(&members).Error; err != nil {
				return err
			}
			var salaries []models.Salary
			if err := tx.Where("pay_period = ?", period).Find(&salaries).Error; err != nil {
				return err
			}
			salaryByStaff := make(map[uint]models.Salary, len(salaries))
			for _, salary := range salaries {
				salaryByStaff[salary.StaffID] = salary
			}
			var attendance []models.Attendance
			if err := tx.Where("date >= ? AND date < ?", period+"-01", nextMonth(period)).Find(&attendance).Error; err != nil {
				return err
			}
			presentByStaff, absentByStaff := map[uint]int{}, map[uint]int{}
			for _, entry := range attendance {
				if entry.Status == "present" {
					presentByStaff[entry.StaffID]++
				}
				if entry.Status == "absent" {
					absentByStaff[entry.StaffID]++
				}
			}
			var leave []models.LeaveRequest
			if err := tx.Where("date >= ? AND date < ? AND status = ?", period+"-01", nextMonth(period), "approved").Find(&leave).Error; err != nil {
				return err
			}
			paidLeaveByStaff := map[uint]int{}
			for _, entry := range leave {
				paidLeaveByStaff[entry.StaffID]++
			}

			for _, member := range members {
				salary := salaryByStaff[member.ID]
				payableDays := presentByStaff[member.ID] + paidLeaveByStaff[member.ID]
				entry := payrollSummaryEntry{StaffID: member.ID, Name: member.Name, Role: member.Role, SalaryID: salary.ID, MonthlyAmount: salary.Amount, Currency: salary.Currency, Status: salary.Status, PresentDays: presentByStaff[member.ID], AbsentDays: absentByStaff[member.ID], PaidLeaveDays: paidLeaveByStaff[member.ID], PayableDays: payableDays, PayableAmount: payableAmount(salary.Amount, payableDays, calendar.WorkingDays)}
				result.Records = append(result.Records, entry)
				result.TotalPayable = result.TotalPayable.Add(entry.PayableAmount)
			}
			return nil
		})
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not calculate payroll summary")
			return
		}
		api.WriteSuccess(w, http.StatusOK, result)
	}
}
