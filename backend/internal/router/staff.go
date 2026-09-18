package router

import (
	"net/http"

	"avinsmart/backend/internal/staff"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func StaffRoutes(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	r.Get("/", staff.List(db))
	r.Post("/", staff.Register(db))
	r.Post("/register", staff.Register(db))
	r.Post("/login", staff.Login(db))
	return r
}
