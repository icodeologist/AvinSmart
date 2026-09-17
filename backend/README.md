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
