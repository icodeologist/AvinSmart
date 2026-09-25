package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"

	"avinsmart/backend/internal/auth"
	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/database"
	"avinsmart/backend/internal/models"
	"avinsmart/backend/internal/money"
	"avinsmart/backend/internal/router"

	"gorm.io/gorm"
)

type fixture struct {
	db       *gorm.DB
	cfg      config.Config
	handler  http.Handler
	outletA  models.Outlet
	outletB  models.Outlet
	productA models.Product
	productB models.Product
	token    string
}

func TestPOSIntegration(t *testing.T) {
	dsn := strings.TrimSpace(os.Getenv("TEST_DATABASE_URL"))
	if dsn == "" {
		t.Skip("set TEST_DATABASE_URL to run PostgreSQL POS integration tests")
	}

	db, err := database.Connect(context.Background(), dsn)
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	defer func() {
		sqlDB, _ := db.DB()
		_ = sqlDB.Close()
	}()
	if err := database.AutoMigrate(db); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}

	t.Run("duplicate order is idempotent", func(t *testing.T) {
		f := newFixture(t, db)
		body := fmt.Sprintf(`{"outlet_id":%d,"price_tier":"retail","items":[{"product_id":%d,"quantity":1}]}`, f.outletA.ID, f.productA.ID)
		first := f.request(http.MethodPost, "/api/v1/orders", body, "order-retry")
		second := f.request(http.MethodPost, "/api/v1/orders", body, "order-retry")
		if first.Code != http.StatusCreated || second.Code != http.StatusCreated {
			t.Fatalf("duplicate order statuses = %d/%d; bodies = %s / %s", first.Code, second.Code, first.Body.String(), second.Body.String())
		}
		var product models.Product
		if err := db.First(&product, f.productA.ID).Error; err != nil {
			t.Fatal(err)
		}
		if product.Quantity != f.productA.Quantity-1 {
			t.Fatalf("stock after duplicate order = %d, want %d", product.Quantity, f.productA.Quantity-1)
		}
		var count int64
		db.Model(&models.Order{}).Count(&count)
		if count != 1 {
			t.Fatalf("orders created = %d, want 1", count)
		}
	})

	t.Run("duplicate payment is idempotent", func(t *testing.T) {
		f := newFixture(t, db)
		orderID := f.createOrder(t, f.productA.ID, 1, "order-payment")
		body := `{"amount":"10.00","method":"cash","cash_tendered":"10.00"}`
		first := f.request(http.MethodPost, fmt.Sprintf("/api/v1/orders/%d/payments", orderID), body, "payment-retry")
		second := f.request(http.MethodPost, fmt.Sprintf("/api/v1/orders/%d/payments", orderID), body, "payment-retry")
		if first.Code != http.StatusCreated || second.Code != http.StatusCreated {
			t.Fatalf("duplicate payment statuses = %d/%d; bodies = %s / %s", first.Code, second.Code, first.Body.String(), second.Body.String())
		}
		var count int64
		db.Model(&models.Payment{}).Where("order_id = ?", orderID).Count(&count)
		if count != 1 {
			t.Fatalf("payments created = %d, want 1", count)
		}
	})

	t.Run("concurrent payments cannot overpay", func(t *testing.T) {
		f := newFixture(t, db)
		orderID := f.createOrder(t, f.productA.ID, 1, "order-concurrent")
		body := `{"amount":"10.00","method":"cash","cash_tendered":"10.00"}`
		var wg sync.WaitGroup
		responses := make(chan int, 2)
		for _, key := range []string{"payment-a", "payment-b"} {
			wg.Add(1)
			go func(key string) {
				defer wg.Done()
				responses <- f.request(http.MethodPost, fmt.Sprintf("/api/v1/orders/%d/payments", orderID), body, key).Code
			}(key)
		}
		wg.Wait()
		close(responses)
		created, rejected := 0, 0
		for status := range responses {
			if status == http.StatusCreated {
				created++
			} else if status == http.StatusBadRequest {
				rejected++
			}
		}
		if created != 1 || rejected != 1 {
			t.Fatalf("concurrent payment results created=%d rejected=%d", created, rejected)
		}
	})

	t.Run("failed order restores stock", func(t *testing.T) {
		f := newFixture(t, db)
		body := fmt.Sprintf(`{"outlet_id":%d,"items":[{"product_id":%d,"quantity":%d}]}`, f.outletA.ID, f.productA.ID, f.productA.Quantity+1)
		response := f.request(http.MethodPost, "/api/v1/orders", body, "order-insufficient")
		if response.Code != http.StatusBadRequest {
			t.Fatalf("failed order status = %d, want 400", response.Code)
		}
		var product models.Product
		db.First(&product, f.productA.ID)
		if product.Quantity != f.productA.Quantity {
			t.Fatalf("stock after failed order = %d, want %d", product.Quantity, f.productA.Quantity)
		}
	})

	t.Run("outlet isolation rejects cross-outlet stock", func(t *testing.T) {
		f := newFixture(t, db)
		products := f.request(http.MethodGet, "/api/v1/products", "", "")
		if products.Code != http.StatusOK || strings.Contains(products.Body.String(), f.productB.Title) {
			t.Fatalf("staff product list leaked another outlet: %d %s", products.Code, products.Body.String())
		}
		crossOutlet := fmt.Sprintf(`{"outlet_id":%d,"items":[{"product_id":%d,"quantity":1}]}`, f.outletA.ID, f.productB.ID)
		response := f.request(http.MethodPost, "/api/v1/orders", crossOutlet, "cross-outlet-order")
		if response.Code != http.StatusBadRequest {
			t.Fatalf("cross-outlet order status = %d, want 400: %s", response.Code, response.Body.String())
		}
	})

	t.Run("partial payments reach exact final balance", func(t *testing.T) {
		f := newFixture(t, db)
		orderID := f.createOrder(t, f.productA.ID, 1, "order-partial")
		first := f.request(http.MethodPost, fmt.Sprintf("/api/v1/orders/%d/payments", orderID), `{"amount":"4.00","method":"cash","cash_tendered":"4.00"}`, "partial-one")
		if first.Code != http.StatusCreated || !strings.Contains(first.Body.String(), `"amount_due":"6.00"`) {
			t.Fatalf("first partial payment = %d %s", first.Code, first.Body.String())
		}
		second := f.request(http.MethodPost, fmt.Sprintf("/api/v1/orders/%d/payments", orderID), `{"amount":"6.00","method":"cash","cash_tendered":"6.00"}`, "partial-two")
		if second.Code != http.StatusCreated || !strings.Contains(second.Body.String(), `"status":"paid"`) || !strings.Contains(second.Body.String(), `"amount_due":"0.00"`) {
			t.Fatalf("final payment = %d %s", second.Code, second.Body.String())
		}
	})
}

func TestSalesAndInventoryHappyPath(t *testing.T) {
	if strings.TrimSpace(os.Getenv("TEST_DATABASE_URL")) == "" {
		t.Skip("set TEST_DATABASE_URL to run PostgreSQL happy-path integration tests")
	}
	db, err := database.Connect(context.Background(), os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	defer func() {
		sqlDB, _ := db.DB()
		_ = sqlDB.Close()
	}()
	if err := database.AutoMigrate(db); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}

	f := newFixture(t, db)
	managerToken, err := auth.IssueToken(f.cfg, 1, "test-sales@example.com", "manager", "staff")
	if err != nil {
		t.Fatal(err)
	}
	f.token = managerToken
	startingQuantity := f.productA.Quantity

	quote := f.request(http.MethodPost, "/api/v1/bills/quote", fmt.Sprintf(`{"outlet_id":%d,"price_tier":"retail","tax_rate":"0","discount":"0.00","items":[{"product_id":%d,"quantity":1}]}`, f.outletA.ID, f.productA.ID), "")
	if quote.Code != http.StatusOK || !strings.Contains(quote.Body.String(), `"total":"10.00"`) {
		t.Fatalf("bill quote status/body = %d/%s", quote.Code, quote.Body.String())
	}

	bill := f.request(http.MethodPost, "/api/v1/bills", fmt.Sprintf(`{"outlet_id":%d,"bill_number":"HAPPY-BILL-1","bill_date":"2026-09-25","payment_method":"cash","cashier":"Test Manager","price_tier":"retail","tax_rate":"0","discount":"0.00","items":[{"product_id":%d,"quantity":1}]}`, f.outletA.ID, f.productA.ID), "happy-bill")
	if bill.Code != http.StatusCreated {
		t.Fatalf("bill creation status/body = %d/%s", bill.Code, bill.Body.String())
	}

	orderID := f.createOrder(t, f.productA.ID, 2, "happy-order")
	payment := f.request(http.MethodPost, fmt.Sprintf("/api/v1/orders/%d/payments", orderID), `{"amount":"20.00","method":"cash","cash_tendered":"20.00"}`, "happy-payment")
	if payment.Code != http.StatusCreated || !strings.Contains(payment.Body.String(), `"status":"paid"`) {
		t.Fatalf("payment status/body = %d/%s", payment.Code, payment.Body.String())
	}

	var product models.Product
	if err := db.First(&product, f.productA.ID).Error; err != nil {
		t.Fatal(err)
	}
	if product.Quantity != startingQuantity-3 {
		t.Fatalf("final stock = %d, want %d", product.Quantity, startingQuantity-3)
	}
	var saleMovements int64
	if err := db.Model(&models.InventoryMovement{}).Where("product_id = ? AND reason = ?", f.productA.ID, "sale").Count(&saleMovements).Error; err != nil {
		t.Fatal(err)
	}
	if saleMovements != 2 {
		t.Fatalf("sale movements = %d, want 2", saleMovements)
	}
	movements := f.request(http.MethodGet, fmt.Sprintf("/api/v1/inventory/movements?product_id=%d", f.productA.ID), "", "")
	if movements.Code != http.StatusOK || !strings.Contains(movements.Body.String(), `"quantity_delta":-1`) || !strings.Contains(movements.Body.String(), `"quantity_delta":-2`) {
		t.Fatalf("inventory movement status/body = %d/%s", movements.Code, movements.Body.String())
	}
}

func newFixture(t *testing.T, db *gorm.DB) fixture {
	t.Helper()
	if err := db.Exec(`TRUNCATE TABLE payments, order_items, orders, inventory_movements, inventory_transfers, products, sub_categories, categories, staff_outlets, staff, outlets, idempotency_records RESTART IDENTITY CASCADE`).Error; err != nil {
		t.Fatalf("reset test database: %v", err)
	}
	outletA := models.Outlet{Name: "Test Outlet A", Status: "active"}
	outletB := models.Outlet{Name: "Test Outlet B", Status: "active"}
	category := models.Category{Name: "Test Category"}
	if err := db.Create(&outletA).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&outletB).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&category).Error; err != nil {
		t.Fatal(err)
	}
	member := models.Staff{Name: "Test Sales", Email: "test-sales@example.com", PasswordHash: "unused", Phone: "000", Role: "sales", Status: "active"}
	if err := db.Create(&member).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.StaffOutlet{StaffID: member.ID, OutletID: outletA.ID}).Error; err != nil {
		t.Fatal(err)
	}
	productA := testProduct(outletA.ID, category.ID, "A", "10.00", 10)
	productB := testProduct(outletB.ID, category.ID, "B", "10.00", 10)
	if err := db.Create(&productA).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&productB).Error; err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{JWTSecret: "integration-secret", JWTIssuer: "integration", JWTExpiry: 3600 * 1000000000}
	token, err := auth.IssueToken(cfg, member.ID, member.Email, member.Role, "staff")
	if err != nil {
		t.Fatal(err)
	}
	return fixture{db: db, cfg: cfg, handler: router.New(db, cfg), outletA: outletA, outletB: outletB, productA: productA, productB: productB, token: token}
}

func testProduct(outletID, categoryID uint, suffix, price string, quantity int) models.Product {
	return models.Product{
		Title:                "Product " + suffix,
		OutletID:             outletID,
		CategoryID:           categoryID,
		SKUID:                "SKU-" + suffix,
		Quantity:             quantity,
		Unit:                 "pcs",
		RetailPrice:          money.MustParse(price),
		CustomerDisplayPrice: money.MustParse(price),
		BoughtPrice:          money.MustParse(price),
		WholeSalePrice:       money.MustParse(price),
	}
}

func (f fixture) createOrder(t *testing.T, productID uint, quantity int, key string) uint {
	t.Helper()
	body := fmt.Sprintf(`{"outlet_id":%d,"price_tier":"retail","items":[{"product_id":%d,"quantity":%d}]}`, f.outletA.ID, productID, quantity)
	response := f.request(http.MethodPost, "/api/v1/orders", body, key)
	if response.Code != http.StatusCreated {
		t.Fatalf("create order status = %d: %s", response.Code, response.Body.String())
	}
	var envelope struct {
		Data struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &envelope); err != nil {
		t.Fatal(err)
	}
	return envelope.Data.ID
}

func (f fixture) request(method, path, body, key string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer "+f.token)
	request.Header.Set("Content-Type", "application/json")
	if key != "" {
		request.Header.Set("Idempotency-Key", key)
	}
	response := httptest.NewRecorder()
	f.handler.ServeHTTP(response, request)
	return response
}
