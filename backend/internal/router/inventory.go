package router

import (
	"net/http"

	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/inventory"
	"avinsmart/backend/internal/middleware"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func InventoryRoutes(db *gorm.DB, cfg config.Config) http.Handler {
	r := chi.NewRouter()
	access := r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin", "manager", "inventory", "inventory_staff"))
	access.Get("/movements", inventory.ListMovements(db))
	access.Get("/transfers", inventory.ListTransfers(db))
	access.With(middleware.Idempotent(db)).Post("/transfers", inventory.Transfer(db))
	return r
}
