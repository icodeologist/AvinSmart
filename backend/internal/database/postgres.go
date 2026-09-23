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
		&models.Outlet{},
		&models.Staff{},
		&models.Salary{},
		&models.Attendance{},
		&models.LeaveRequest{},
		&models.Bill{},
		&models.BillItem{},
		&models.Notification{},
		&models.IdempotencyRecord{},
		&models.Order{},
		&models.OrderItem{},
		&models.Payment{},
	); err != nil {
		return err
	}

	if db.Migrator().HasColumn(&models.Admin{}, "photo") {
		if err := db.Migrator().DropColumn(&models.Admin{}, "photo"); err != nil {
			return err
		}
	}

	outlet, err := seedDefaultOutlet(db)
	if err != nil {
		return err
	}

	// Migrate products last. Existing rows get outlet_id filled in first so
	// Postgres can create the FK constraint without referencing a missing row.
	if db.Migrator().HasTable(&models.Product{}) {
		if !db.Migrator().HasColumn(&models.Product{}, "outlet_id") {
			if err := db.Migrator().AddColumn(&models.Product{}, "outlet_id"); err != nil {
				return err
			}
		}

		if err := db.Model(&models.Product{}).
			Where("outlet_id = 0").
			Update("outlet_id", outlet.ID).Error; err != nil {
			return err
		}
	}

	return db.AutoMigrate(&models.Product{})
}

func seedDefaultOutlet(db *gorm.DB) (*models.Outlet, error) {
	var outlet models.Outlet
	if err := db.Where(models.Outlet{Name: "Main Branch"}).FirstOrCreate(&outlet, models.Outlet{
		Name:     "Main Branch",
		Status:   "active",
		Location: "Main store",
	}).Error; err != nil {
		return nil, err
	}

	return &outlet, nil
}
