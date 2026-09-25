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
```

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
- `PATCH /api/v1/salaries/{id}/pay`

Example salary body:

```json
{
  "staff_id": 1,
  "amount": 3200,
  "currency": "USD",
  "pay_period": "2026-09"
}
```

## Authentication

`POST /api/v1/auth/login` and `POST /api/v1/staff/login` return a JWT in `data.token`.
Send it on protected requests with:

```text
Authorization: Bearer <token>
```

Staff registration and login are public. Staff listing requires an `admin` or `manager`
token. All salary endpoints require an `admin` or `manager` token. Set a long random
`JWT_SECRET` outside local development.

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
