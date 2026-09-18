package router

import (
	"context"
	"net/http"
	"time"

	"avinsmart/backend/internal/api"

	"gorm.io/gorm"
)

func rootHandler(w http.ResponseWriter, r *http.Request) {
	api.WriteSuccess(w, http.StatusOK, map[string]string{
		"message": "Hello World",
	})
}

func databaseHealthHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		sqlDB, err := db.DB()
		if err != nil {
			api.WriteError(w, http.StatusServiceUnavailable, err.Error())
			return
		}

		if err := sqlDB.PingContext(ctx); err != nil {
			api.WriteError(w, http.StatusServiceUnavailable, err.Error())
			return
		}

		api.WriteSuccess(w, http.StatusOK, map[string]string{
			"status": "healthy",
		})
	}
}
