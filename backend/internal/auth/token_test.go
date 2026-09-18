package auth

import (
	"testing"
	"time"

	"avinsmart/backend/internal/config"
)

func TestTokenRoundTrip(t *testing.T) {
	cfg := config.Config{
		JWTSecret: "test-secret",
		JWTIssuer: "test-issuer",
		JWTExpiry: time.Hour,
	}

	token, err := IssueToken(cfg, 42, "manager@example.com", "manager", "staff")
	if err != nil {
		t.Fatalf("IssueToken() error = %v", err)
	}

	principal, err := ParseToken(cfg, token)
	if err != nil {
		t.Fatalf("ParseToken() error = %v", err)
	}
	if principal.UserID != 42 || principal.Email != "manager@example.com" || principal.Role != "manager" || principal.UserType != "staff" {
		t.Fatalf("unexpected principal: %+v", principal)
	}
}

func TestTokenRejectsWrongSecret(t *testing.T) {
	cfg := config.Config{JWTSecret: "test-secret", JWTIssuer: "test-issuer", JWTExpiry: time.Hour}
	token, err := IssueToken(cfg, 42, "manager@example.com", "manager", "staff")
	if err != nil {
		t.Fatalf("IssueToken() error = %v", err)
	}

	cfg.JWTSecret = "different-secret"
	if _, err := ParseToken(cfg, token); err == nil {
		t.Fatal("ParseToken() accepted a token signed with a different secret")
	}
}
