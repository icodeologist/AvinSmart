package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func New(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	r.Get("/", rootHandler)
	r.Get("/ping", rootHandler)
	r.Get("/health/db", databaseHealthHandler(db))

	r.Route("/api/v1", func(r chi.Router) {
		r.Mount("/auth", AuthRoutes(db))
	})

	return r
}
