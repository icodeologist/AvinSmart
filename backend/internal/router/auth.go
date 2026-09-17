package router

import (
	"net/http"

	"avinsmart/backend/internal/auth"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func AuthRoutes(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	r.Post("/register", auth.RegisterAdmin(db))
	r.Post("/login", loginHandler)

	return r
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotImplemented, map[string]string{
		"message": "login endpoint ready",
	})
}
