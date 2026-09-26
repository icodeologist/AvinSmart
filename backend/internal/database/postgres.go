package database

import (
	"context"
	"fmt"
	"strings"

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
	// Create/seed the outlet table before adding non-null outlet ownership to
	// legacy sales rows. This lets us backfill old data before foreign keys are
	// created by the full migration below.
	if err := db.AutoMigrate(&models.Outlet{}); err != nil {
		return err
	}
	outlet, err := seedDefaultOutlet(db)
	if err != nil {
		return err
	}
	if err := prepareOutletOwnershipColumns(db, outlet.ID); err != nil {
		return err
	}

	if db.Migrator().HasTable(&models.Product{}) {
		if !db.Migrator().HasColumn(&models.Product{}, "outlet_id") {
			if err := db.Migrator().AddColumn(&models.Product{}, "outlet_id"); err != nil {
				return err
			}
		}
		if err := db.Model(&models.Product{}).Where("outlet_id = 0").Update("outlet_id", outlet.ID).Error; err != nil {
			return err
		}
		if err := prepareProductSKUIndex(db); err != nil {
			return err
		}
	}

	if err := db.AutoMigrate(
		&models.Admin{},
		&models.Category{},
		&models.SubCategory{},
		&models.Outlet{},
		&models.Staff{},
		&models.StaffOutlet{},
		&models.Salary{},
		&models.Attendance{},
		&models.LeaveRequest{},
		&models.PayrollCalendar{},
		&models.PublicHoliday{},
		&models.PayrollAudit{},
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

	if err := migrateBillTaxRate(db); err != nil {
		return err
	}

	if err := ensureProductSubcategories(db); err != nil {
		return err
	}
	if err := db.AutoMigrate(&models.Product{}, &models.InventoryMovement{}, &models.InventoryTransfer{}); err != nil {
		return err
	}
	if db.Dialector.Name() == "postgres" && db.Migrator().HasTable(&models.Product{}) {
		if err := db.Exec(`ALTER TABLE "products" ALTER COLUMN "sub_category_id" SET NOT NULL`).Error; err != nil {
			return err
		}
	}
	if err := db.AutoMigrate(&models.ProductPriceHistory{}); err != nil {
		return err
	}
	return backfillInventoryOpeningMovements(db)
}

// Every product must have a subcategory. Existing products without one are
// assigned the reserved "None" subcategory within their own category.
func ensureProductSubcategories(db *gorm.DB) error {
	if !db.Migrator().HasTable(&models.Product{}) || !db.Migrator().HasTable(&models.SubCategory{}) {
		return nil
	}
	if err := db.Exec(`
		INSERT INTO sub_categories (category_id, name)
		SELECT DISTINCT p.category_id, 'None'
		FROM products p
		WHERE p.sub_category_id IS NULL
		ON CONFLICT (category_id, name) DO NOTHING
	`).Error; err != nil {
		return err
	}
	return db.Exec(`
		UPDATE products p
		SET sub_category_id = sc.id
		FROM sub_categories sc
		WHERE p.sub_category_id IS NULL
		  AND sc.category_id = p.category_id
		  AND sc.name = 'None'
	`).Error
}

func backfillInventoryOpeningMovements(db *gorm.DB) error {
	if !db.Migrator().HasTable("products") || !db.Migrator().HasTable("inventory_movements") {
		return nil
	}
	return db.Exec(`
		INSERT INTO inventory_movements (outlet_id, product_id, quantity_delta, reason)
		SELECT p.outlet_id, p.id, p.quantity, 'opening_stock'
		FROM products p
		WHERE p.quantity <> 0
		  AND NOT EXISTS (
			SELECT 1 FROM inventory_movements m WHERE m.product_id = p.id
		  )
	`).Error
}

func prepareProductSKUIndex(db *gorm.DB) error {
	if db.Dialector.Name() != "postgres" || !db.Migrator().HasTable("products") {
		return nil
	}
	if err := db.Exec(`DO $$
DECLARE index_record record;
BEGIN
  FOR index_record IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'products'
      AND indexdef LIKE 'CREATE UNIQUE INDEX%'
      AND indexdef LIKE '%(sku_id)%'
      AND indexdef NOT LIKE '%(outlet_id, sku_id)%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', index_record.indexname);
  END LOOP;
END $$;`).Error; err != nil {
		return err
	}
	return db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_products_outlet_sku ON products (outlet_id, sku_id)`).Error
}

func prepareOutletOwnershipColumns(db *gorm.DB, outletID uint) error {
	if db.Dialector.Name() != "postgres" {
		return nil
	}
	for _, table := range []string{"orders", "bills", "payments"} {
		if !db.Migrator().HasTable(table) || db.Migrator().HasColumn(table, "outlet_id") {
			continue
		}
		if err := db.Exec(`ALTER TABLE "` + table + `" ADD COLUMN "outlet_id" bigint NOT NULL DEFAULT 0`).Error; err != nil {
			return err
		}
	}
	for _, table := range []string{"orders", "bills", "payments"} {
		if db.Migrator().HasTable(table) {
			if err := db.Exec(`UPDATE "`+table+`" SET "outlet_id" = ? WHERE "outlet_id" = 0`, outletID).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func migrateBillTaxRate(db *gorm.DB) error {
	if db.Dialector.Name() != "postgres" || !db.Migrator().HasTable(&models.Bill{}) {
		return nil
	}

	columns, err := db.Migrator().ColumnTypes(&models.Bill{})
	if err != nil {
		return err
	}

	for _, column := range columns {
		if !strings.EqualFold(column.Name(), "tax_rate") {
			continue
		}

		precision, scale, known := column.DecimalSize()
		if known && precision >= 12 && scale >= 4 {
			return nil
		}

		return db.Exec(`
			ALTER TABLE "bills"
			ALTER COLUMN "tax_rate" TYPE numeric(12,4)
			USING "tax_rate"::numeric(12,4)
		`).Error
	}

	return fmt.Errorf("bills.tax_rate column was not found after auto-migration")
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
