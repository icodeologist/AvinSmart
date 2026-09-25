package integration

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"testing"

	"avinsmart/backend/internal/auth"
	"avinsmart/backend/internal/database"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

func TestSalaryIntegration(t *testing.T) {
	if strings.TrimSpace(testDatabaseURL()) == "" {
		t.Skip("set TEST_DATABASE_URL to run PostgreSQL salary integration tests")
	}
	db := integrationDatabase(t)

	t.Run("salary creation is idempotent and paid rows are immutable", func(t *testing.T) {
		f := newSalaryFixture(t, db)
		managerToken := f.token
		salesToken, err := auth.IssueToken(f.cfg, f.staffID, "test-sales@example.com", "sales", "staff")
		if err != nil {
			t.Fatal(err)
		}
		f.token = salesToken
		forbidden := f.request(http.MethodGet, "/api/v1/salaries?pay_period=2026-09", "", "")
		if forbidden.Code != http.StatusForbidden {
			t.Fatalf("sales salary access status = %d, want 403", forbidden.Code)
		}
		f.token = managerToken
		body := fmt.Sprintf(`{"staff_id":%d,"amount":"3200.00","currency":"INR","pay_period":"2026-09"}`, f.staffID)
		first := f.request(http.MethodPost, "/api/v1/salaries", body, "salary-create")
		second := f.request(http.MethodPost, "/api/v1/salaries", body, "salary-create")
		if first.Code != http.StatusCreated || second.Code != http.StatusCreated {
			t.Fatalf("salary statuses = %d/%d: %s / %s", first.Code, second.Code, first.Body.String(), second.Body.String())
		}
		var count int64
		db.Model(&models.Salary{}).Count(&count)
		if count != 1 {
			t.Fatalf("salary rows = %d, want 1", count)
		}
		var id uint
		if err := db.Model(&models.Salary{}).Select("id").Where("staff_id = ?", f.staffID).Scan(&id).Error; err != nil {
			t.Fatal(err)
		}
		paid := f.request(http.MethodPatch, fmt.Sprintf("/api/v1/salaries/%d/pay", id), `{"method":"bank_transfer"}`, "salary-pay")
		if paid.Code != http.StatusOK {
			t.Fatalf("mark paid status = %d: %s", paid.Code, paid.Body.String())
		}
		updated := f.request(http.MethodPatch, fmt.Sprintf("/api/v1/salaries/%d", id), body, "salary-edit")
		if updated.Code != http.StatusConflict {
			t.Fatalf("edit paid salary status = %d, want 409: %s", updated.Code, updated.Body.String())
		}
	})

	t.Run("attendance leave and summary use payroll rules", func(t *testing.T) {
		f := newSalaryFixture(t, db)
		calendar := f.request(http.MethodGet, "/api/v1/salaries/calendar?pay_period=2026-09", "", "")
		if calendar.Code != http.StatusOK || !strings.Contains(calendar.Body.String(), `"working_days"`) {
			t.Fatalf("calendar response = %d %s", calendar.Code, calendar.Body.String())
		}
		created := f.request(http.MethodPost, "/api/v1/salaries", fmt.Sprintf(`{"staff_id":%d,"amount":"100.00","currency":"INR","pay_period":"2026-09"}`, f.staffID), "salary-summary-create")
		if created.Code != http.StatusCreated {
			t.Fatalf("create salary status = %d: %s", created.Code, created.Body.String())
		}
		attendance := f.request(http.MethodPut, "/api/v1/salaries/attendance", fmt.Sprintf(`{"staff_id":%d,"date":"2026-09-01","status":"present"}`, f.staffID), "attendance-upsert")
		if attendance.Code != http.StatusOK {
			t.Fatalf("attendance status = %d: %s", attendance.Code, attendance.Body.String())
		}
		future := f.request(http.MethodPut, "/api/v1/salaries/attendance", fmt.Sprintf(`{"staff_id":%d,"date":"2999-01-01","status":"present"}`, f.staffID), "attendance-future")
		if future.Code != http.StatusBadRequest {
			t.Fatalf("future attendance status = %d, want 400", future.Code)
		}
		leave := f.request(http.MethodPost, "/api/v1/salaries/leave-requests", fmt.Sprintf(`{"pay_period":"2026-09","staff_id":%d,"date":"2026-09-02","reason":"medical"}`, f.staffID), "leave-create")
		if leave.Code != http.StatusCreated {
			t.Fatalf("leave status = %d: %s", leave.Code, leave.Body.String())
		}
		duplicate := f.request(http.MethodPost, "/api/v1/salaries/leave-requests", fmt.Sprintf(`{"pay_period":"2026-09","staff_id":%d,"date":"2026-09-02","reason":"duplicate"}`, f.staffID), "leave-duplicate")
		if duplicate.Code != http.StatusConflict {
			t.Fatalf("duplicate leave status = %d, want 409", duplicate.Code)
		}
		summary := f.request(http.MethodGet, "/api/v1/salaries/summary?pay_period=2026-09", "", "")
		if summary.Code != http.StatusOK || !strings.Contains(summary.Body.String(), `"present_days":1`) {
			t.Fatalf("summary response = %d %s", summary.Code, summary.Body.String())
		}
	})
}

type salaryFixture struct {
	fixture
	staffID uint
}

func newSalaryFixture(t *testing.T, db *gorm.DB) salaryFixture {
	t.Helper()
	base := newFixture(t, db)
	if err := db.Exec("TRUNCATE TABLE payroll_audits, public_holidays, payroll_calendars, leave_requests, attendance, salaries RESTART IDENTITY CASCADE").Error; err != nil {
		t.Fatalf("reset salary tables: %v", err)
	}
	var member models.Staff
	if err := db.Where("email = ?", "test-sales@example.com").First(&member).Error; err != nil {
		t.Fatal(err)
	}
	token, err := auth.IssueToken(base.cfg, member.ID, member.Email, "manager", "staff")
	if err != nil {
		t.Fatal(err)
	}
	base.token = token
	return salaryFixture{fixture: base, staffID: member.ID}
}

func testDatabaseURL() string {
	return strings.TrimSpace(os.Getenv("TEST_DATABASE_URL"))
}

func integrationDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := database.Connect(context.Background(), testDatabaseURL())
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	if err := database.AutoMigrate(db); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}
	t.Cleanup(func() {
		sqlDB, _ := db.DB()
		_ = sqlDB.Close()
	})
	return db
}
