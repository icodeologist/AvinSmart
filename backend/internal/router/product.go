package router

import (
	"net/http"

	"avinsmart/backend/internal/products"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func ProductRoutes(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	r.Get("/", products.ListProducts(db))
	r.Post("/", products.CreateProduct(db))

	return r
}
