package database

import (
	"context"

	"avinsmart/backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Connect(ctx context.Context, databaseURL string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(5)

	if err := sqlDB.PingContext(ctx); err != nil {
		_ = sqlDB.Close()
		return nil, err
	}

	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&models.Admin{},
		&models.Category{},
		&models.SubCategory{},
		&models.Product{},
	); err != nil {
		return err
	}

	if db.Migrator().HasColumn(&models.Admin{}, "photo") {
		return db.Migrator().DropColumn(&models.Admin{}, "photo")
	}

	return nil
}
