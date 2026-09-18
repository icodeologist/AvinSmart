package router

import (
	"net/http"

	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/staff"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func StaffRoutes(db *gorm.DB, cfg config.Config) http.Handler {
	r := chi.NewRouter()
	r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin", "manager")).Get("/", staff.List(db))
	r.Post("/", staff.Register(db))
	r.Post("/register", staff.Register(db))
	r.Post("/login", staff.Login(db, cfg))
	return r
}
