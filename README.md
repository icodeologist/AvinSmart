# AvinSmart

AvinSmart is a production-oriented retail operations platform for managing outlets, products, prices, inventory, point-of-sale orders, staff, payroll, notifications, and operational reporting.

This repository contains the current v1 release of a real retail product. It is not a tutorial or learning project. Every change can affect sales, stock, staff records, or payroll, so changes must be reviewed and tested as production changes.

## v1 release and access policy

The v1 application is scheduled to be made reachable to everyone today. That means the deployed application may be publicly reachable during the launch window; it does **not** mean that anonymous visitors can access retail data or perform business operations.

The current access model is:

- Admin and staff login require valid credentials and return JWT sessions.
- Staff registration is an administrator-only operation.
- Administrator creation is performed from a trusted server terminal with the `backend/register` command; there is no public administrator provisioning flow in the backend.
- Operational APIs are protected by authentication and role checks. Outlet access is scoped to staff assignments.
- The public launch is temporary. After the v1 launch and validation window, public use will be disabled and access will be limited to approved users, operators, and deployment administrators.

Before switching to the restricted phase, the release owner must implement and verify the lock-down control. The current codebase does not yet provide a single `PUBLIC_ACCESS=false` switch, maintenance gate, or network allowlist. Do not treat changing the frontend navigation as a security control; the backend and deployment boundary must enforce the restriction.

## What the product does

- Admin dashboard and business summaries
- Outlet and outlet-scoped staff management
- Staff login for sales and inventory operations
- Product catalog, categories, subcategories, and price history
- POS order quotes, creation, payments, cancellations, expiry, and refunds
- Exact decimal money handling and tax calculation
- Inventory movement history and outlet-to-outlet transfers
- Salaries, attendance, leave, payroll calendar, payment, and audit history
- Notifications for operational events
- PostgreSQL persistence with automatic migrations on server startup
- Protection against duplicate order, payment, salary, and attendance submissions

## How the backend protects the business

The frontend provides screens for people to use, but the backend makes the
final decision about every request. This is important because a user can send
requests without using the browser. The backend therefore checks the user,
their role, their outlet assignments, the product price, available stock, and
the current state of an order before changing anything.

### One sale is treated as one complete operation

Creating and paying for a sale involves several changes: the order is stored,
stock is reserved or reduced, payments are recorded, and notifications may be
created. The backend uses a database transaction for these related changes.

A transaction means the database treats the group as one unit:

- If every step succeeds, all changes are saved together.
- If any step fails, the earlier changes are rolled back.
- The system does not leave behind an order with missing stock changes or a
  payment without a valid order.

This is especially important when two cashiers try to sell the last items at
the same time. The backend locks the relevant stock rows while it checks and
updates them, so the same stock cannot be sold twice.

### Safe retries with idempotency

Phones, browsers, and networks can retry a request when the first response is
slow or lost. For a sale or payment, a normal retry could accidentally create
two orders or charge the same payment twice.

For sensitive write requests, the client sends a unique `Idempotency-Key`.
The backend remembers the result for that key. If the same request arrives
again, it returns the original result instead of performing the operation a
second time. This protects order creation, payments, salary changes, and
attendance updates from duplicate submissions.

The key must be unique for each intended operation. A client must reuse the
same key when retrying the same operation and create a new key for a new
operation.

### Exact money and pricing rules

Retail money is never handled as an approximate computer floating-point
number. Prices, discounts, tax, payments, refunds, and salary amounts are
handled as decimal values and returned as strings such as `"125.50"`.

For an order, the backend:

1. Loads the current product and selected price tier.
2. Checks that the product belongs to the requested outlet context.
3. Calculates the subtotal, discount, tax, and final total using exact decimal
   values.
4. Rounds tax once to two decimal places using the application’s defined rule.
5. Stores the final values so later reports do not silently change when a
   product price is updated.

The frontend cannot override these totals by sending a different total.

### Outlet and role protection

Every authenticated request carries a signed session token. The backend checks
the token and then checks what the user is allowed to do.

- Administrators can manage the business across outlets.
- Sales staff can use the sales functions available to their assigned outlet.
- Inventory staff can manage inventory within their permitted outlet scope.
- Managers and administrators can perform the payroll actions allowed by
  their role and staff assignments.
- A user cannot gain access to another outlet by changing an `outlet_id` in a
  request.

Outlet assignments are read from the database when access is checked instead
of being permanently copied into the login token. Removing an assignment can
therefore take effect without waiting for an old token to expire.

### Order states and stock safety

The order service is the main POS flow. It supports quotes, order creation,
partial payments, completed payments, cancellation, expiry, and refunds.

Pending orders reserve stock. If an order is cancelled or expires, the
reserved stock is released. Payment and cancellation operations lock the order
while checking its current state, which prevents two requests from completing
or cancelling the same payment at the same time.

Inventory movements record the quantity change, outlet, product, reason, user,
and related source record. Transfers create matching outgoing and incoming
movements, and both sides are processed together so stock does not disappear
between outlets.

### Payroll and audit history

Salary and attendance changes also use idempotent writes and database
transactions. Salary amounts are fixed decimal values, paid records cannot be
silently changed, and payroll actions are limited by role and staff access.
Important payroll changes write an audit record containing the affected item,
action, user, and before/after values. This makes later review possible when a
salary, attendance record, or payment is questioned.

### Database startup and background work

The API connects to PostgreSQL before accepting requests and runs the required
database migrations at startup. A production backup must be taken before a
release that changes database structure or business data.

The server also runs a background worker that finds expired pending orders and
releases their reserved stock. This worker is part of the backend deployment;
it must remain running wherever the API is deployed.

### Notifications and compatibility

Completed sales and staff activity can create notifications for administrators.
Notifications are created with the related business operation so a failed
operation does not report a success that was never saved.

The newer `/api/v1/orders` endpoints are the canonical POS flow. The older
`/api/v1/bills` endpoints remain available for existing clients, but new
integrations should use orders. This avoids maintaining two different sale
implementations with different stock and payment behavior.

## Repository layout

```text
backend/                 Go API, PostgreSQL access, auth, domain modules
backend/cmd/server/      HTTP server entrypoint
backend/register/        Trusted CLI for creating an administrator
backend/internal/        API routes, models, services, middleware, tests
frontend/                React/Vite web application
postman/                 Postman workspace assets
docker-compose.yml       Local PostgreSQL, API, and test services
```

The backend is the source of truth for identity, permissions, outlet access,
pricing, stock, money, and transaction rules. The frontend is only a user
interface and must not be treated as a security boundary.

## Main parts of the system

- Backend: Go API that applies the retail rules and talks to PostgreSQL
- Database: PostgreSQL, used for orders, stock, users, payroll, and audit data
- Frontend: React/Vite web application used by administrators and staff
- Local runtime: Docker Compose for running the API and a local database

## Local development

### Prerequisites

- Go 1.23 or newer
- Node.js and npm
- Docker with Docker Compose, recommended for PostgreSQL

### Start the backend and database

From the repository root:

```bash
docker compose up --build backend
```

This starts PostgreSQL on `localhost:5433` and the API on `http://localhost:8080`. The API container connects to the database through the Compose network.

To run the API directly instead, start PostgreSQL and run:

```bash
cd backend
go run ./cmd/server
```

The direct process uses the local defaults documented in [`backend/README.md`](backend/README.md). Never use those defaults in a production environment.

### Start the frontend

```bash
cd frontend
npm ci
npm run dev
```

The Vite development server runs on `http://localhost:3000` and proxies `/api/v1` to the backend. For a separately hosted API, set `VITE_API_BASE_URL` using [`frontend/.env.example`](frontend/.env.example).

### Create the first administrator

Create the initial administrator from a trusted operator terminal, with the backend database configuration available in the environment:

```bash
cd backend
go run ./register
```

The command prompts for the administrator details and reads the password privately. Do not create administrator accounts through an exposed shell, public route, or committed seed file.

## Production deployment

Use separate production services for the frontend, API, PostgreSQL database, TLS termination, backups, and secret storage. A typical deployment is:

```text
Browser -> HTTPS reverse proxy/CDN -> frontend static assets
                         |
                         +-> HTTPS API -> Go server -> private PostgreSQL
```

### Required production configuration

Set these values in the API runtime secret/environment configuration:

```env
SERVER_ADDRESS=:8080
DATABASE_URL=postgres://<user>:<password>@<private-db-host>:5432/avinsmart?sslmode=require
APP_ENV=production
JWT_SECRET=<at-least-32-character-random-secret>
JWT_ISSUER=avinsmart-api
JWT_EXPIRY_HOURS=24
CORS_ALLOWED_ORIGINS=https://<approved-frontend-domain>
```

Production startup rejects the development JWT secret, short JWT secrets, and an empty production CORS allowlist. Keep the database private, use TLS for external traffic, and store secrets in the deployment platform rather than in the repository.

### Deployment sequence

1. Provision PostgreSQL and configure automated encrypted backups.
2. Apply the production environment variables and verify the database URL.
3. Build and deploy the API image from `backend/Dockerfile`.
4. Allow only the approved frontend origin in `CORS_ALLOWED_ORIGINS`.
5. Run the trusted administrator creation command once, if the database is new.
6. Build the frontend with `npm ci && npm run build` and publish `frontend/dist` behind HTTPS.
7. Verify `/ping`, `/health/db`, admin login, staff login, outlet scoping, order creation, payment, and logout using non-production test accounts.
8. Confirm logs, database backups, alerting, TLS renewal, and rollback steps before opening the v1 launch window.

The server automatically runs GORM migrations at startup. Take a verified database backup before every production deployment that can change schema or business data.

## Launch plan

### Phase 1 — v1 public launch

During today’s launch window, the application endpoint can be publicly reachable so the release team can validate the product with real users and operators. Keep all business routes authenticated, use production secrets, monitor login and order activity, and avoid exposing database or internal service ports.

The release owner should record the launch start time, deployed commit, active frontend/API URLs, database backup identifier, and the person responsible for rollback.

### Phase 2 — restricted operation

After launch validation, close public access at the infrastructure and application layers:

- Put the application behind the approved domain, VPN, identity proxy, or network allowlist.
- Disable or remove public registration/provisioning paths.
- Keep staff creation administrator-only and keep administrator creation terminal-only.
- Add and verify a backend-enforced maintenance/private-mode gate before deploying the restriction.
- Rotate credentials that were used during demonstrations or testing.
- Review active JWT sessions and force reauthentication if required.
- Confirm the public hostname no longer exposes protected application routes.

This phase is a required production hardening step, not a frontend-only configuration change.

## Authentication and API notes

The API is rooted at `/api/v1`.

- `POST /api/v1/auth/login` authenticates an administrator.
- `POST /api/v1/staff/login` authenticates assigned staff.
- Protected requests send `Authorization: Bearer <token>`.
- `POST /api/v1/staff/register` is protected by an admin role.
- Orders accept an `Idempotency-Key` for retry-safe mutations.
- Money values are sent and returned as decimal strings, not floating-point JSON numbers.
- `/api/v1/bills` remains a compatibility path; new integrations should use `/api/v1/orders`.

Health endpoints are intended for deployment checks:

- `GET /ping` — process health
- `GET /health/db` — database connectivity health

Do not expose verbose database errors, development secrets, test accounts, or real customer/business data in public logs or support screenshots.

## Testing

Run backend unit and package tests with:

```bash
cd backend
go test ./...
```

Run the frontend production build with:

```bash
cd frontend
npm ci
npm run build
```

The disposable PostgreSQL integration suite can be run with:

```bash
docker compose --profile test run --rm --build backend-test
```

For more API detail and backend-specific development notes, see [`backend/README.md`](backend/README.md).

## Operational rules

- Never commit `.env` files, passwords, JWT secrets, database dumps, or production uploads.
- Treat migrations and money/order logic as high-risk changes.
- Use least-privilege database credentials for the running API.
- Back up before releases and test restore procedures regularly.
- Review authentication, authorization, outlet isolation, idempotency, and audit behavior when changing business flows.
- Keep the public launch temporary and document the exact time and criteria for switching to restricted operation.

## License and ownership

This repository is maintained as the AvinSmart retail product. Confirm the organization’s commercial licensing and third-party asset obligations before any external redistribution.
