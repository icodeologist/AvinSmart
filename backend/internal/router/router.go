package router

import (
	"net/http"
	"os"
	"slices"

	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/notifications"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func New(db *gorm.DB, cfg config.Config) http.Handler {
	r := chi.NewRouter()
	r.Use(corsMiddleware(cfg.AllowedOrigins))
	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.Dir(staticDirectory()))))
	r.Get("/", rootHandler)
	r.Get("/ping", rootHandler)
	r.Get("/health/db", databaseHealthHandler(db))

	r.Route("/api/v1", func(r chi.Router) {
		r.Mount("/auth", AuthRoutes(db, cfg))
		r.Mount("/products", ProductRoutes(db, cfg))
		r.Mount("/categories", CategoryRoutes(db, cfg))
		r.Mount("/outlets", OutletRoutes(db, cfg))
		r.Mount("/staff", StaffRoutes(db, cfg))
		r.Mount("/salaries", SalaryRoutes(db, cfg))
		r.Mount("/bills", BillRoutes(db, cfg))
		r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin", "sales", "inventory_staff")).Mount("/orders", OrderRoutes(db))
		r.With(middleware.RequireAuth(cfg), middleware.RequireRoles("admin")).Mount("/dashboard", DashboardRoutes(db))
		r.Mount("/inventory", InventoryRoutes(db, cfg))
		r.With(middleware.RequireAuth(cfg)).Mount("/notifications", notifications.Routes(db))
	})

	return r
}

// staticDirectory supports starting the development server from either the
// backend directory or cmd/server, without losing access to uploaded photos.
func staticDirectory() string {
	for _, dir := range []string{"static", "../static", "../../static", "backend/static"} {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return dir
		}
	}
	return "static"
}

func corsMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" {
				w.Header().Add("Vary", "Origin")
			}
			if slices.Contains(allowedOrigins, origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
