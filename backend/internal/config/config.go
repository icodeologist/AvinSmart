package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Address     string
	DatabaseURL string
	JWTSecret   string
	JWTIssuer   string
	JWTExpiry   time.Duration
}

func Load() Config {
	return Config{
		Address:     getEnv("SERVER_ADDRESS", ":8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/avinsmart?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "dev-only-change-this-secret"),
		JWTIssuer:   getEnv("JWT_ISSUER", "avinsmart-api"),
		JWTExpiry:   getDurationEnv("JWT_EXPIRY_HOURS", 24) * time.Hour,
	}
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
