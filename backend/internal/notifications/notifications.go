package notifications

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/auth"
	"avinsmart/backend/internal/middleware"
	"avinsmart/backend/internal/models"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type createRequest struct {
	Type      string `json:"type"`
	Title     string `json:"title"`
	Message   string `json:"message"`
	ActionURL string `json:"action_url"`
}

func Create(db *gorm.DB, recipientID uint, recipientType, notificationType, title, message string, actionURL string) (*models.Notification, error) {
	notification := &models.Notification{
		RecipientID:   recipientID,
		RecipientType: recipientType,
		Type:          notificationType,
		Title:         title,
		Message:       message,
		ActionURL:     actionURL,
	}
	if err := db.Create(notification).Error; err != nil {
		return nil, err
	}
	return notification, nil
}

func Routes(db *gorm.DB) http.Handler {
	r := chi.NewRouter()
	r.Get("/", list(db))
	r.Get("/unread-count", unreadCount(db))
	r.Post("/", createForCurrentUser(db))
	r.Post("/read-all", markAllRead(db))
	r.Patch("/{id}/read", markRead(db))
	return r
}

func currentPrincipal(r *http.Request) (auth.Principal, bool) {
	return middleware.PrincipalFromContext(r.Context())
}

func list(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := currentPrincipal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication required")
			return
		}

		limit := 25
		if value, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && value > 0 && value <= 100 {
			limit = value
		}

		var items []models.Notification
		err := db.Where("recipient_id = ? AND recipient_type = ?", principal.UserID, principal.UserType).
			Order("created_at DESC").Limit(limit).Find(&items).Error
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not fetch notifications")
			return
		}
		api.WriteSuccess(w, http.StatusOK, items)
	}
}

func unreadCount(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := currentPrincipal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		var count int64
		err := db.Model(&models.Notification{}).
			Where("recipient_id = ? AND recipient_type = ? AND read_at IS NULL", principal.UserID, principal.UserType).
			Count(&count).Error
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not count unread notifications")
			return
		}
		api.WriteSuccess(w, http.StatusOK, map[string]int64{"count": count})
	}
}

func createForCurrentUser(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := currentPrincipal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		var payload createRequest
		if err := api.DecodeJSON(r, &payload); err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid json body")
			return
		}
		payload.Type = strings.TrimSpace(payload.Type)
		payload.Title = strings.TrimSpace(payload.Title)
		payload.Message = strings.TrimSpace(payload.Message)
		payload.ActionURL = strings.TrimSpace(payload.ActionURL)
		fields := api.Fields{}
		if payload.Title == "" {
			fields.Add("title", "title is required")
		}
		if payload.Message == "" {
			fields.Add("message", "message is required")
		}
		if payload.ActionURL != "" && !strings.HasPrefix(payload.ActionURL, "/") {
			fields.Add("action_url", "action_url must be an internal path")
		}
		if fields.HasErrors() {
			api.WriteValidation(w, "invalid notification", fields)
			return
		}
		if payload.Type == "" {
			payload.Type = "general"
		}
		item, err := Create(db, principal.UserID, principal.UserType, payload.Type, payload.Title, payload.Message, payload.ActionURL)
		if err != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not create notification")
			return
		}
		api.WriteSuccess(w, http.StatusCreated, item)
	}
}

func markRead(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := currentPrincipal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		id, err := strconv.ParseUint(chi.URLParam(r, "id"), 10, 64)
		if err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid notification id")
			return
		}
		now := time.Now()
		result := db.Model(&models.Notification{}).Where("id = ? AND recipient_id = ? AND recipient_type = ?", id, principal.UserID, principal.UserType).Update("read_at", &now)
		if result.Error != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not mark notification as read")
			return
		}
		if result.RowsAffected == 0 {
			api.WriteError(w, http.StatusNotFound, "notification not found")
			return
		}
		api.WriteSuccess(w, http.StatusOK, map[string]bool{"read": true})
	}
}

func markAllRead(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		principal, ok := currentPrincipal(r)
		if !ok {
			api.WriteError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		now := time.Now()
		result := db.Model(&models.Notification{}).Where("recipient_id = ? AND recipient_type = ? AND read_at IS NULL", principal.UserID, principal.UserType).Update("read_at", &now)
		if result.Error != nil {
			api.WriteError(w, http.StatusInternalServerError, "could not mark notifications as read")
			return
		}
		api.WriteSuccess(w, http.StatusOK, map[string]int64{"updated": result.RowsAffected})
	}
}
