package router

import (
	"net/http"

	"avinsmart/backend/internal/salaries"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func SalaryRoutes(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	r.Get("/", salaries.List(db))
	r.Post("/", salaries.Create(db))
	r.Patch("/{id}/pay", salaries.MarkPaid(db))
	return r
}
