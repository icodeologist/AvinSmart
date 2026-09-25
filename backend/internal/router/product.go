package router

import (
	"net/http"

	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/products"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func ProductRoutes(db *gorm.DB, cfg config.Config) http.Handler {
	r := chi.NewRouter()
	r.With(middleware.RequireAuth(cfg)).Get("/", products.ListProducts(db))
	r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin")).Get("/price-history/recent", products.ListRecentPriceHistory(db))
	r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin", "manager", "inventory", "inventory_staff")).Post("/", products.CreateProduct(db))
	r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin")).Patch("/{id}/prices", products.UpdatePrices(db))
	r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin")).Get("/{id}/price-history", products.ListPriceHistory(db))

	return r
}
