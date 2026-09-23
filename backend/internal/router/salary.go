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
	r.Post("/", salaries.Create(db))
	r.Patch("/{id}/pay", salaries.MarkPaid(db))
	r.Get("/attendance", salaries.ListAttendance(db))
	r.Put("/attendance", salaries.UpsertAttendance(db))
	r.Get("/leave-requests", salaries.ListLeaveRequests(db))
	r.Post("/leave-requests", salaries.CreateLeaveRequest(db))
	r.Patch("/leave-requests/{id}", salaries.UpdateLeaveRequest(db))
	return r
}
