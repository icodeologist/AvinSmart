package outlets

import (
	"net/http"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/outletaccess"

	"gorm.io/gorm"
)

func ListOutlets(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := middleware.PrincipalFromContext(r.Context())
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication is required")
			return
		}
		var outlets []models.Outlet
		query, err := outletaccess.WhereAllowed(db, principal, db, "outlets.id")
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not check outlet access")
			return
		}
		if err := query.Order("created_at desc").Find(&outlets).Error; err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch outlets")
			return
		}

		api.WriteSuccess(w, http.StatusOK, outlets)
	}
}
