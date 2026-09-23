package router

import (
	"net/http"

	"avinsmart/backend/internal/bills"
	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/middleware"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func BillRoutes(db *gorm.DB, cfg config.Config) http.Handler {
	r := chi.NewRouter()
	sales := r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin", "manager", "sales"))
	sales.Get("/", bills.ListBills(db))
	sales.Post("/quote", bills.Quote(db))
	sales.With(middleware.Idempotent(db)).Post("/", bills.CreateBill(db))

	return r
}
