package config

import "os"

type Config struct {
	Address     string
	DatabaseURL string
}

func Load() Config {
	return Config{
		Address:     getEnv("SERVER_ADDRESS", ":8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/avinsmart?sslmode=disable"),
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}
