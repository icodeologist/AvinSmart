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
  "role": "sales"
}
```

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
