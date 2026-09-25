package router

import (
	"net/http"

	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/outlets"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func OutletRoutes(db *gorm.DB, cfg config.Config) http.Handler {
	r := chi.NewRouter()
	management := r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin", "manager"))
	management.Get("/", outlets.ListOutlets(db))
	r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin")).Post("/", outlets.CreateOutlet(db))

	return r
}
