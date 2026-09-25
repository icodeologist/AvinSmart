package router

import (
	"net/http"

	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/orders"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func OrderRoutes(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	r.Post("/quote", orders.Quote(db))
	r.With(middleware.Idempotent(db)).Post("/", orders.Create(db))
	r.Get("/", orders.List(db))
	r.Get("/{id}", orders.Get(db))
	r.With(middleware.Idempotent(db)).Post("/{id}/payments", orders.RecordPayment(db))
	r.With(middleware.RequireRoles("admin", "manager")).Post("/{id}/payments/{payment_id}/refund", orders.RefundPayment(db))
	r.Post("/{id}/cancel", orders.Cancel(db))
	return r
}
