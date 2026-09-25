package router

import (
	"net/http"

	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/salaries"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func SalaryRoutes(db *gorm.DB, cfg config.Config) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequireAuth(cfg))
	r.Use(middleware.RequireRoles("admin", "manager"))
	r.Get("/", salaries.List(db))
	r.With(middleware.Idempotent(db)).Post("/", salaries.Create(db))
	r.With(middleware.Idempotent(db)).Patch("/{id}", salaries.Update(db))
	r.With(middleware.Idempotent(db)).Patch("/{id}/pay", salaries.MarkPaid(db))
	r.Get("/summary", salaries.Summary(db))
	r.With(middleware.RequireRoles("admin")).Get("/audit", salaries.ListAudit(db))
	r.Get("/calendar", salaries.Calendar(db))
	r.With(middleware.Idempotent(db)).Put("/calendar", salaries.UpdateCalendar(db))
	r.With(middleware.Idempotent(db)).Post("/calendar/holidays", salaries.AddHoliday(db))
	r.With(middleware.Idempotent(db)).Delete("/calendar/holidays/{id}", salaries.DeleteHoliday(db))
	r.Get("/attendance", salaries.ListAttendance(db))
	r.With(middleware.Idempotent(db)).Put("/attendance", salaries.UpsertAttendance(db))
	r.Get("/leave-requests", salaries.ListLeaveRequests(db))
	r.With(middleware.Idempotent(db)).Post("/leave-requests", salaries.CreateLeaveRequest(db))
	r.With(middleware.Idempotent(db)).Patch("/leave-requests/{id}", salaries.UpdateLeaveRequest(db))
	return r
}
