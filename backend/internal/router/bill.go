package router

import (
	"net/http"

	"avinsmart/backend/internal/bills"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func BillRoutes(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	r.Get("/", bills.ListBills(db))
	r.Post("/", bills.CreateBill(db))

	return r
}