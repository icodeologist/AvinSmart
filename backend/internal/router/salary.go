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
	return r
}
