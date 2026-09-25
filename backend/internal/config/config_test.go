package config

import (
	"strings"
	"testing"
)

func TestLoadReadsDeploymentSettings(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("JWT_SECRET", strings.Repeat("s", 32))
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://admin.example.com, https://pos.example.com")
	t.Setenv("JWT_EXPIRY_HOURS", "12")

	cfg := Load()

	if cfg.Environment != "production" || len(cfg.AllowedOrigins) != 2 || cfg.JWTExpiry.Hours() != 12 {
		t.Fatalf("deployment settings not loaded: %+v", cfg)
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("valid production config rejected: %v", err)
	}
}

func TestValidateRejectsDevelopmentSecretInProduction(t *testing.T) {
	cfg := Config{
		Environment:    "production",
		JWTSecret:      developmentJWTSecret,
		JWTExpiry:      24,
		AllowedOrigins: []string{"https://admin.example.com"},
	}

	if err := cfg.Validate(); err == nil {
		t.Fatal("development JWT secret accepted in production")
	}
}
