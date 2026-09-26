package router

import (
	"net/http"

	"avinsmart/backend/internal/categories"
	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/middleware"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func CategoryRoutes(db *gorm.DB, cfg config.Config) http.Handler {
	r := chi.NewRouter()
	r.Get("/", categories.List(db))
	r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin")).Post("/", categories.Create(db))
	r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin")).Patch("/{categoryID}", categories.Update(db))
	r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin")).Delete("/{categoryID}", categories.Delete(db))
	r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin")).Post("/{categoryID}/subcategories", categories.CreateSubCategory(db))
	r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin")).Delete("/{categoryID}/subcategories/{subcategoryID}", categories.DeleteSubCategory(db))
	return r
}
