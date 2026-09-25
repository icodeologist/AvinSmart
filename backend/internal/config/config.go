package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

const developmentJWTSecret = "dev-only-change-this-secret"

type Config struct {
	Address        string
	DatabaseURL    string
	JWTSecret      string
	JWTIssuer      string
	JWTExpiry      time.Duration
	Environment    string
	AllowedOrigins []string
}

func Load() Config {
	return Config{
		Address:        getEnv("SERVER_ADDRESS", ":8080"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/avinsmart?sslmode=disable"),
		JWTSecret:      getEnv("JWT_SECRET", developmentJWTSecret),
		JWTIssuer:      getEnv("JWT_ISSUER", "avinsmart-api"),
		JWTExpiry:      getDurationEnv("JWT_EXPIRY_HOURS", 24) * time.Hour,
		Environment:    getEnv("APP_ENV", "development"),
		AllowedOrigins: getCSVEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001"),
	}
}

func (c Config) Validate() error {
	if c.JWTExpiry <= 0 {
		return fmt.Errorf("JWT_EXPIRY_HOURS must be greater than zero")
	}

	if !strings.EqualFold(strings.TrimSpace(c.Environment), "production") {
		return nil
	}

	if c.JWTSecret == "" || c.JWTSecret == developmentJWTSecret {
		return fmt.Errorf("JWT_SECRET must be set to a production secret")
	}
	if len(c.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET must contain at least 32 characters in production")
	}
	if len(c.AllowedOrigins) == 0 {
		return fmt.Errorf("CORS_ALLOWED_ORIGINS must contain at least one origin in production")
	}

	return nil
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}

func getDurationEnv(key string, fallback int) time.Duration {
	value, err := strconv.Atoi(os.Getenv(key))
	if err != nil || value <= 0 {
		return time.Duration(fallback)
	}
	return time.Duration(value)
}

func getCSVEnv(key, fallback string) []string {
	value := getEnv(key, fallback)
	parts := strings.Split(value, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		if origin := strings.TrimSpace(part); origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}
