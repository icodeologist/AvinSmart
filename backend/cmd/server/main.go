package main

import (
	"context"
	"log"
	"net/http"

	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/database"
	"avinsmart/backend/internal/router"
)

func main() {
	ctx := context.Background()
	cfg := config.Load()

	db, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("database handle failed: %v", err)
	}
	defer sqlDB.Close()

	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("database migration failed: %v", err)
	}

	log.Printf("database connected and migrated")
	log.Printf("server listening on http://localhost%s", cfg.Address)
	if err := http.ListenAndServe(cfg.Address, router.New(db, cfg)); err != nil {
		log.Fatal(err)
	}
}
