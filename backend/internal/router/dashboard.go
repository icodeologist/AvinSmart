package router

import (
	"net/http"

	"avinsmart/backend/internal/dashboard"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func DashboardRoutes(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	r.Get("/summary", dashboard.SummaryHandler(db))
	return r
}
