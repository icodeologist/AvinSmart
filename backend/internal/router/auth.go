package router

import (
	"net/http"

	"avinsmart/backend/internal/auth"
	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/profile"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func AuthRoutes(db *gorm.DB, cfg config.Config) http.Handler {
	r := chi.NewRouter()
	r.Post("/register", auth.RegisterAdmin(db))
	r.Post("/login", auth.LoginAdmin(db, cfg))
	r.With(middleware.RequireAuth(cfg)).Patch("/profile", profile.Update(db))

	return r
}
