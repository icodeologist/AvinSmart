package router

import (
	"net/http"
	"slices"

	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/notifications"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

var allowedOrigins = []string{
	"http://localhost:3000",
	"http://localhost:3001",
}

func New(db *gorm.DB, cfg config.Config) http.Handler {
	r := chi.NewRouter()
	r.Use(corsMiddleware)
	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	r.Get("/", rootHandler)
	r.Get("/ping", rootHandler)
	r.Get("/health/db", databaseHealthHandler(db))

	r.Route("/api/v1", func(r chi.Router) {
		r.Mount("/auth", AuthRoutes(db, cfg))
		r.Mount("/products", ProductRoutes(db))
		r.Mount("/categories", CategoryRoutes(db, cfg))
		r.Mount("/outlets", OutletRoutes(db))
		r.Mount("/staff", StaffRoutes(db, cfg))
		r.Mount("/salaries", SalaryRoutes(db, cfg))
		r.Mount("/bills", BillRoutes(db))
		r.Mount("/orders", OrderRoutes(db))
		r.With(middleware.RequireAuth(cfg)).Mount("/notifications", notifications.Routes(db))
	})

	return r
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if slices.Contains(allowedOrigins, origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
