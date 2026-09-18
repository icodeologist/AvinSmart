package router

import (
	"net/http"

	"avinsmart/backend/internal/outlets"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func OutletRoutes(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	r.Get("/", outlets.ListOutlets(db))
	r.Post("/", outlets.CreateOutlet(db))

	return r
}
