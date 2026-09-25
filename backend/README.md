# Backend

Go backend for avinSmart.

The backend uses GORM with PostgreSQL and runs auto-migration for:

- `categories`
- `products`

## Environment

Copy the example values and update them for your local PostgreSQL database.

```bash
cp .env.example .env
```

```env
SERVER_ADDRESS=:8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/avinsmart?sslmode=disable
APP_ENV=development
JWT_SECRET=replace-this-with-a-long-random-secret
JWT_ISSUER=avinsmart-api
JWT_EXPIRY_HOURS=24
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

For production, set `APP_ENV=production`, use a random `JWT_SECRET` with at
least 32 characters, and provide the exact browser origins in
`CORS_ALLOWED_ORIGINS` as a comma-separated list. The server refuses to start
with the development JWT secret or without production CORS origins. JWT
expiration is controlled by `JWT_EXPIRY_HOURS`.

## Run

```bash
go run ./cmd/server
```

Then open:

- http://localhost:8080/
- http://localhost:8080/ping
- http://localhost:8080/health/db

## JSON API

All API requests use JSON bodies and all responses use the common envelope:

```json
{ "success": true, "data": {} }
```

Staff endpoints:

- `GET /api/v1/staff`
- `POST /api/v1/staff/register`
- `POST /api/v1/staff/login`

Example registration body:

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "change-me-123",
  "phone": "+1 512 555 0178",
  "role": "sales",
  "outlet_ids": [1]
}
```

Managers, sales, and inventory staff must have at least one active outlet
assignment. Admins have explicit cross-outlet access; manager staff-management
requests are limited to the manager's own assignments.

Salary endpoints:

- `GET /api/v1/salaries`
- `POST /api/v1/salaries`
- `PATCH /api/v1/salaries/{id}`
- `PATCH /api/v1/salaries/{id}/pay`
- `GET /api/v1/salaries/summary?pay_period=YYYY-MM`
- `GET /api/v1/salaries/audit?entity=salary&entity_id=1`
- `GET /api/v1/salaries/calendar?pay_period=YYYY-MM`
- `PUT /api/v1/salaries/calendar`
- `POST /api/v1/salaries/calendar/holidays`
- `DELETE /api/v1/salaries/calendar/holidays/{id}`
- `GET /api/v1/salaries/attendance?staff_id=1&month=YYYY-MM`
- `PUT /api/v1/salaries/attendance`
- `GET /api/v1/salaries/leave-requests?staff_id=1&month=YYYY-MM`
- `POST /api/v1/salaries/leave-requests`
- `PATCH /api/v1/salaries/leave-requests/{id}`

Example salary body:

```json
{
  "staff_id": 1,
  "amount": "3200.00",
  "currency": "INR",
  "pay_period": "2026-09"
}
```

Salary amounts are decimal strings with at most two decimal places. Currency is
limited to INR, USD, EUR, or GBP, and all salary records in one pay period use
the same currency. Mutating salary and leave requests require a unique
`Idempotency-Key` header. Only admins and managers may manage payroll; managers
can access staff assigned to their outlets. Leave requests are manager-created,
must be in the selected month, cannot be future-dated, and are unique per staff
member/date. Paid salary records are immutable.

Attendance and payroll dates use UTC `YYYY-MM-DD` values. Payroll uses fixed
monthly salary prorated by present days plus approved paid leave over the
configured working-day count. Public holidays are persisted in the payroll
calendar and reduce that count; weekends are excluded from the default count.
Payroll audit history is available to administrators through the audit endpoint.

Attendance example:

```json
{
  "staff_id": 1,
  "date": "2026-09-24",
  "status": "present",
  "note": "Counter shift"
}
```

Leave approval example:

```json
{ "status": "approved" }
```

## Authentication

`POST /api/v1/auth/login` and `POST /api/v1/staff/login` return a JWT in `data.token`.
Send it on protected requests with:

```text
Authorization: Bearer <token>
```

Staff registration and login are public. Staff listing requires an `admin` or `manager`
token. All salary endpoints require an `admin` or `manager` token. Set a long random
`JWT_SECRET` outside local development. The web app stores administrator and POS
tokens under separate browser session keys, so signing out of a counter does not
sign out the administrator dashboard (and vice versa).

## Money rules

Sales money is sent as decimal strings such as `"12.30"`, never JSON
floating-point numbers. The backend stores sales amounts as exact decimal
values with at most two decimal places (paise). Orders and bills use the
shared pricing package, so the selected price tier is the source for the
subtotal and final total. Tax is calculated from the selected subtotal and
rounded once to two decimal places using half-away-from-zero rounding.

## Sale flows

`/api/v1/orders` is the canonical POS sale flow. It owns outlet-scoped stock
reservation, partial payments, cancellation, expiry, and payment state. New
POS screens and integrations must use its quote, create, payment, and cancel
endpoints.

`/api/v1/bills` remains available as a compatibility path for existing invoice
clients. It is not a second POS design: responses identify it with
`Deprecation: true`, `X-Canonical-Sale-Flow: /api/v1/orders`, and a `Link`
successor header. Migrate new integrations to orders while legacy clients are
transitioned safely.

Order reports are available at `GET /api/v1/orders?outlet_id=<id>`. They include
outlet-scoped orders plus exact gross sales, applied payments, refunds, cash
tendered, change, and net collected totals.

## Inventory history

Stock changes are recorded in `inventory_movements` with a signed quantity,
outlet, product, reason, actor, and optional source record. Use
`GET /api/v1/inventory/movements` to reconcile current quantities. Transfers
are created with an idempotent `POST /api/v1/inventory/transfers` body such as:

```json
{
  "source_outlet_id": 1,
  "destination_outlet_id": 2,
  "product_id": 17,
  "quantity": 4
}
```

The transfer locks source and destination stock, rejects negative transfers,
creates a destination product record when needed, and writes paired
`transfer_out`/`transfer_in` movements.

## Integration tests

The POS integration suite uses a disposable PostgreSQL database and covers
idempotent orders/payments, concurrent payment races, stock rollback, outlet
isolation, and exact partial-payment balances.

```bash
TEST_DATABASE_URL='postgres://postgres:postgres@localhost:5432/avinsmart_test?sslmode=disable' \
  go test ./internal/integration -run TestPOSIntegration -count=1
```

Without `TEST_DATABASE_URL`, the suite is skipped so the normal unit-test
command remains usable on machines without PostgreSQL.

The repository also includes a disposable Docker test database and backend
test runner. From the repository root:

```bash
docker compose --profile test run --rm --build backend-test
```

Run the development backend and its persistent PostgreSQL database with:

```bash
docker compose up --build backend
```

Stop the stack and remove its database volume with `docker compose down -v`.
