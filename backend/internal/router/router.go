package router

import (
	"net/http"
	"slices"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

var allowedOrigins = []string{
	"http://localhost:3000",
	"http://localhost:3001",
}

func New(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	r.Use(corsMiddleware)
	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	r.Get("/", rootHandler)
	r.Get("/ping", rootHandler)
	r.Get("/health/db", databaseHealthHandler(db))

	r.Route("/api/v1", func(r chi.Router) {
		r.Mount("/auth", AuthRoutes(db))
		r.Mount("/products", ProductRoutes(db))
		r.Mount("/outlets", OutletRoutes(db))
		r.Mount("/staff", StaffRoutes(db))
		r.Mount("/salaries", SalaryRoutes(db))
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
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
