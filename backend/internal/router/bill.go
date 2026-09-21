package router

import (
	"net/http"

	"avinsmart/backend/internal/bills"
	"avinsmart/backend/internal/middleware"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func BillRoutes(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	r.Get("/", bills.ListBills(db))
	r.With(middleware.Idempotent(db)).Post("/", bills.CreateBill(db))

	return r
}
