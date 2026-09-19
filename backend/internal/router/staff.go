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
	management := r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin", "manager"))
	management.Get("/", staff.List(db))
	management.Post("/", staff.Register(db))
	management.Post("/register", staff.Register(db))
	management.Patch("/{id}", staff.Update(db))
	management.Patch("/{id}/password", staff.ChangePassword(db))
	management.Delete("/{id}", staff.Delete(db))
	r.Post("/login", staff.Login(db, cfg))
	return r
}
