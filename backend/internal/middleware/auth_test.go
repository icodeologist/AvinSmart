package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"avinsmart/backend/internal/auth"
	"avinsmart/backend/internal/config"
)

func testAuthConfig() config.Config {
	return config.Config{JWTSecret: "test-secret", JWTIssuer: "test-issuer", JWTExpiry: time.Hour}
}

func TestRequireAuthRejectsMissingToken(t *testing.T) {
	handler := RequireAuth(testAuthConfig())(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/", nil))

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", recorder.Code)
	}
}

func TestRequireRolesRejectsWrongRole(t *testing.T) {
	cfg := testAuthConfig()
	token, err := auth.IssueToken(cfg, 7, "sales@example.com", "sales", "staff")
	if err != nil {
		t.Fatalf("IssueToken() error = %v", err)
	}

	handler := RequireAuth(cfg)(RequireRoles("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	})))
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.Header.Set("Authorization", "Bearer "+token)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", recorder.Code)
	}
}
