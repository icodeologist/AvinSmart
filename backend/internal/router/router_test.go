package router

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"avinsmart/backend/internal/config"
)

func TestCORSUsesConfiguredOrigins(t *testing.T) {
	handler := New(nil, config.Config{AllowedOrigins: []string{"https://admin.example.com"}})

	allowed := httptest.NewRequest(http.MethodOptions, "/api/v1/orders", nil)
	allowed.Header.Set("Origin", "https://admin.example.com")
	allowed.Header.Set("Access-Control-Request-Headers", "Idempotency-Key")
	allowedResponse := httptest.NewRecorder()
	handler.ServeHTTP(allowedResponse, allowed)

	if allowedResponse.Code != http.StatusNoContent || allowedResponse.Header().Get("Access-Control-Allow-Origin") != "https://admin.example.com" {
		t.Fatalf("configured origin was not allowed: status=%d headers=%v", allowedResponse.Code, allowedResponse.Header())
	}
	if allowedResponse.Header().Get("Access-Control-Allow-Headers") == "" {
		t.Fatal("CORS preflight did not advertise allowed headers")
	}

	blocked := httptest.NewRequest(http.MethodOptions, "/api/v1/orders", nil)
	blocked.Header.Set("Origin", "https://untrusted.example.com")
	blockedResponse := httptest.NewRecorder()
	handler.ServeHTTP(blockedResponse, blocked)
	if blockedResponse.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("unconfigured origin was allowed")
	}
}
