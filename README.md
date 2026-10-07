# AvinSmart

AvinSmart is a real retail operations platform for outlets, products, inventory, POS sales, staff, payroll, and reporting. This is a production project, not a learning project.

## v1 release policy

- v1 is publicly reachable for the launch and validation period.
- Publicly reachable does not mean anonymous access to business data.
- Admin and staff areas require valid login credentials.
- Staff registration is admin-only.
- The first administrator is created from the trusted backend command.
- After launch validation, public access will be closed for approved users only.
- The lock-down must be enforced by the backend and deployment network, not only by hiding frontend pages.

The current codebase does not yet include a single public/private mode switch. Add and verify that control before closing public access.

## Main features

- Admin dashboard and reports
- Outlet and staff management
- Product, category, and price management
- POS orders, payments, cancellations, expiry, and refunds
- Inventory movements and outlet transfers
- Salaries, attendance, leave, payroll, and audit history
- Notifications
- PostgreSQL data storage

## Important backend protections

The backend is the security and business-rules boundary. The frontend must not be trusted to enforce permissions or totals.

### Transactions

Related changes are saved together in a database transaction. If any step fails, the complete operation is rolled back.

This protects operations such as:

- Creating an order and reserving stock
- Recording a payment
- Cancelling or expiring an order and releasing stock
- Transferring stock between outlets
- Updating salary or attendance records

### Duplicate request protection

Sensitive write requests use an Idempotency-Key. If a browser or network retries the same request, the backend returns the original result instead of creating a second order, payment, salary change, or attendance update.

Reuse the same key only when retrying the same operation. Use a new key for a new operation.

### Stock and order safety

- Stock rows are checked and locked before updates.
- The same item cannot be sold twice because of simultaneous requests.
- Pending orders reserve stock.
- Cancelled or expired orders release reserved stock.
- Payments and cancellations check the current order state before changing it.
- Inventory movements record the product, outlet, quantity, reason, user, and related order or transfer.

### Money and permissions

- Money is stored as exact decimal values, not floating-point values.
- The backend calculates prices, discounts, tax, totals, payments, and refunds.
- Client-provided totals cannot override backend calculations.
- Users are checked by role and outlet assignment on every protected request.
- Changing an outlet ID in a request cannot bypass outlet access.
- Payroll changes are restricted and important changes are audited.

## Repository layout

~~~text
backend/             API, database, authentication, business rules, tests
backend/register/    Trusted command for creating an administrator
frontend/            Web application
docker-compose.yml   Local database and application services
~~~

## Local setup

Requirements: Go, Node.js/npm, and Docker.

Start the backend and database:

~~~bash
docker compose up --build backend
~~~

Start the frontend:

~~~bash
cd frontend
npm ci
npm run dev
~~~

Create the first administrator from a trusted terminal:

~~~bash
cd backend
go run ./register
~~~

Local addresses:

- Frontend: http://localhost:3000
- API: http://localhost:8080
- Database: localhost:5433

## Production deployment

Use HTTPS and keep PostgreSQL private. Store secrets in the deployment platform, never in Git.

Required API settings:

~~~env
SERVER_ADDRESS=:8080
DATABASE_URL=postgres://<user>:<password>@<private-db-host>:5432/avinsmart?sslmode=require
APP_ENV=production
JWT_SECRET=<random-secret-at-least-32-characters>
JWT_ISSUER=avinsmart-api
JWT_EXPIRY_HOURS=24
CORS_ALLOWED_ORIGINS=https://<approved-frontend-domain>
~~~

The public `/register` frontend page uses `POST /api/v1/auth/register`. New
administrator accounts are signed in immediately after successful registration.

Before launch:

1. Provision PostgreSQL and encrypted backups.
2. Deploy the backend and frontend over HTTPS.
3. Create the first administrator from a trusted terminal.
4. Verify admin login, staff login, outlet access, orders, payments, logout, and health checks.
5. Confirm monitoring, backups, rollback, and TLS renewal.
6. Record the deployed commit and launch owner.

The backend runs database migrations at startup. Take a verified backup before production releases.

## After the public launch

- Restrict access using the approved domain, VPN, identity proxy, or network allowlist.
- Keep staff creation admin-only.
- Keep administrator creation terminal-only.
- Add and verify a backend private-mode or maintenance gate.
- Rotate test and demonstration credentials.
- Review active sessions.
- Confirm that the public hostname no longer exposes the application.

## API basics

- Admin login: POST /api/v1/auth/login
- Staff login: POST /api/v1/staff/login
- Staff registration: POST /api/v1/staff/register — admin token required
- Health: GET /ping and GET /health/db
- New POS integrations should use /api/v1/orders
- Existing bill clients may continue using /api/v1/bills

Protected requests use:

~~~text
Authorization: Bearer <token>
~~~

## Testing

Backend tests:

~~~bash
cd backend
go test ./...
~~~

Frontend build:

~~~bash
cd frontend
npm ci
npm run build
~~~

Integration tests:

~~~bash
docker compose --profile test run --rm --build backend-test
~~~

## Rules

- Never commit passwords, JWT secrets, database dumps, or production uploads.
- Back up before releases.
- Review authentication, outlet access, money, stock, transactions, and audit behavior when changing backend code.
- Keep the public launch temporary and document when restricted access begins.
