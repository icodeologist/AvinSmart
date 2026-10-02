# How We Did It

This file is a personal development log. Keep it uncommitted.

## 2026-09-21 — Idempotent bill creation

Commit: `133bc86 Add idempotent bill requests`

- Compared `avinSmart` with `/home/denzil/dev/avinsShop`.
- Found that `avinSmart`'s POS payment button was still demo-only.
- Found that the reference implementation's idempotency layer did not use its request hash and did not distinguish operations.
- Added an idempotency record model to `avinSmart`.
- Added `Idempotency-Key` protection to `POST /api/v1/bills`.
- Scoped keys by HTTP method and request path.
- Stored a SHA-256 hash of the request and rejected reuse with different data using `409 Conflict`.
- Returned `409 Conflict` with `Retry-After: 1` when the original request is still processing.
- Replayed the original response status, body, and headers for the same request retry.
- Missing or oversized keys/bodies now receive client errors instead of being processed.
- Verified with `GOCACHE=/tmp/avinsmart-go-cache go test ./...`.

## Next

- Add a payment amount field for partial payments.
- Add focused tests for concurrent payments using a PostgreSQL test database.
- Decide how cash overpayment and change should be represented.

## 2026-09-21 — Real POS staff authentication

- The POS login used to accept one hardcoded demo email and password in the browser.
- It now calls the backend staff login endpoint and uses the returned JWT token.
- The logged-in staff member returned by the backend is stored in the POS session.
- Order and payment routes now require a valid token and allow admin, manager, or sales staff.
- Logging out clears the POS session and token.
- Plain English reason: a cashier must be verified by the server before they can create orders or accept payments. Browser-only login is not security.

## 2026-09-21 — Connect POS to real products and orders

- The POS used to show a hardcoded list of sample products.
- It now loads products from the backend database, including real prices, categories, images, and stock counts.
- Adding an item to the cart now uses the real database product ID.
- `Pay Now` now creates a real order and then records its payment.
- Each order request and payment request gets its own idempotency key.
- If payment fails after the order is created, retrying uses the same pending order instead of creating another order.
- Plain English reason: the screen must use the same product and stock data as the backend, otherwise the cashier could sell the wrong item or price.

## 2026-09-21 — Store all four order price totals

- We decided not to copy the old customer-credit system from `avinsShop`.
- The order now stores retail, customer-display, bought-cost, and wholesale totals.
- Each order item stores the four product-price snapshots used when the order was created.
- The backend calculates these values from the locked database product rows.
- The frontend may display calculated values, but the backend is the source of truth for money.
- Plain English reason: product prices may change later, so an old order must remember the exact prices used at the time of sale.

## 2026-09-21 — Add partial payments to POS

- The POS now lets the cashier enter how much the customer is paying.
- A payment can be smaller than the order total.
- The backend returns the updated remaining balance after each payment.
- The POS keeps the same pending order open until the balance reaches zero.
- The price tier is locked while an order is partially paid, so the order total cannot change halfway through payment.
- No customer-credit account is created; an unpaid balance belongs only to the pending order.

## 2026-09-21 — Full POS and multi-outlet audit

The project builds successfully, but the following issues should be solved in this order. The first items can cause money, stock, or outlet data to be wrong.

### 1. Make every sale belong to one outlet — critical

Products have an outlet, but orders do not. The POS does not choose an outlet, and the order API accepts any product ID without checking the outlet. This means a cashier could sell stock from the wrong branch and reports could mix all branches together.

We need outlet IDs on staff, orders, payments, and sales reports. The backend must check the cashier's outlet and filter products and stock by that outlet.

### 2. Protect all inventory, outlet, and bill-changing APIs — critical

Product creation, outlet creation, bill creation, and bill listing are currently reachable without login. Anyone who can reach the API could change inventory, create fake bills, or read sales data.

All changing endpoints must require authentication and role checks. Read endpoints must expose only the data the current user is allowed to see.

### 3. Release stock when an unpaid order is cancelled or abandoned — critical

Creating an order immediately reduces stock. If the cashier closes the browser or presses Clear after a partial payment, the order remains pending and the stock stays reduced forever.

We need order cancellation/expiry and a transaction that returns reserved stock safely.

### 4. Use safe money arithmetic and fix the old bill total calculation — critical

Prices and payments use `float64`. Floating-point rounding can create small balance errors. The older bill flow also calculates the final total from the customer-display total even when another price tier is selected.

Money should use integer smallest units, such as paise, and both bill and order calculations should use one shared pricing rule.

### 5. Remove the duplicate sale paths or define their roles clearly — high

The application now has both `/bills` and `/orders`. They calculate totals differently and have different security rules. This can produce different stock, payment, and report results for what should be the same sale.

We should choose one canonical POS sale flow and migrate or deprecate the other.

### 6. Add real cash handling, cancellation, and refunds — high

The POS currently records only the amount applied. It does not support cash tendered, change returned, refunds, or reversing a payment.

These operations need explicit records and permissions so the cash drawer and reports remain correct.

### 7. Assign staff to outlets and enforce that assignment — high

Staff have roles but no outlet assignment. A sales user can authenticate, but the system has no way to restrict them to one branch.

Add staff-outlet access rules, with managers/admins allowed to work across outlets only when intended.

### 8. Add inventory movements and outlet transfers — medium

The current stock number is changed directly. There is no history explaining whether stock changed because of a sale, purchase, correction, return, or transfer.

Add an inventory movement ledger and explicit transfer workflow between outlets.

### 9. Add automated tests for business-critical behavior — medium

There are no order, payment, stock, outlet-isolation, or idempotency integration tests. The current tests mainly cover authentication.

Add PostgreSQL-backed tests for concurrent payments, duplicate requests, stock rollback, cancelled orders, and cross-outlet access.

### 10. Improve deployment configuration and frontend session handling — lower

The frontend hardcodes `http://localhost:8080`, CORS allows only local development origins, and the JWT fallback secret is unsafe outside development. POS logout also removes the shared browser token.

Move these values to environment configuration and separate or safely manage admin and POS sessions.

GitHub issues created for this audit:

- [#1 Enforce outlet isolation for POS sales and inventory](https://github.com/icodeologist/AvinSmart/issues/1)
- [#2 Protect inventory, outlet, and bill APIs](https://github.com/icodeologist/AvinSmart/issues/2)
- [#3 Release stock when an unpaid order is cancelled or abandoned](https://github.com/icodeologist/AvinSmart/issues/3)
- [#4 Replace float money arithmetic and fix bill total calculation](https://github.com/icodeologist/AvinSmart/issues/4)
- [#5 Choose one canonical POS sale flow](https://github.com/icodeologist/AvinSmart/issues/5)
- [#6 Add cash change, cancellation, and refund handling](https://github.com/icodeologist/AvinSmart/issues/6)
- [#7 Assign staff to outlets and enforce outlet permissions](https://github.com/icodeologist/AvinSmart/issues/7)
- [#8 Add inventory movement history and outlet transfers](https://github.com/icodeologist/AvinSmart/issues/8)
- [#9 Add integration tests for POS money, stock, and concurrency](https://github.com/icodeologist/AvinSmart/issues/9)
- [#10 Make deployment and frontend session configuration production-safe](https://github.com/icodeologist/AvinSmart/issues/10)

## 2026-09-21 — Make POS JSX readable

- The POS page had almost the entire screen inside one very long return statement.
- Split the screen into readable components: header, product catalog, cart items, cart panel, and payment summary.
- Kept the POS behavior unchanged.
- Plain English reason: readable components make it easier to understand and safely change one part of the POS without breaking another part.

## 2026-09-21 — Protect inventory, outlet, and bill APIs

Commit: `37ca84e Protect inventory outlet and bill APIs`

- Product, outlet, and bill routes now require a valid login token.
- Product creation is limited to admin, manager, or inventory users.
- Outlet management is limited to admin and manager users.
- Bill access and creation are limited to admin, manager, or sales users.
- Frontend product and outlet requests now send the logged-in user's token.
- Added tests proving missing authentication returns `401` and the wrong role returns `403`.
- Plain English reason: before this change, someone could change inventory or create/read bills without logging in.

## 2026-09-21 — Order and partial-payment foundation

Commit: `dbb3e8f Add POS orders and partial payments`

- Added `orders`, `order_items`, and `payments` tables through GORM migration.
- Added `POST /api/v1/orders` to create a POS order and reserve stock.
- Added `GET /api/v1/orders/{id}` to inspect an order and its payments.
- Added `POST /api/v1/orders/{id}/payments` for full or partial payments.
- Added idempotency protection to order creation and payment creation.
- Added a `FOR UPDATE` row lock around payment balance calculation.
- Documented in the payment handler why the lock is required.
- A payment cannot exceed the current amount due; remaining balance is retained on the order.

## 2026-09-25 — Enforce outlet isolation for POS sales and inventory (GitHub #1)

TL;DR: every sale now has an outlet, staff access is assigned to active outlets, and the backend rejects cross-outlet product, quote, order, payment, bill, and report access.

- Added `staff_outlets` assignments and included assigned outlets in staff list/login responses.
- Read staff assignments from the database for every request so access changes take effect immediately instead of waiting for JWT expiry.
- Added outlet ownership to orders, payments, and bills; existing sales are backfilled to Main Branch before ownership foreign keys are created.
- Restricted product catalog, POS quotes, order creation/payment/read, bill creation/listing, and outlet listing to the authenticated user's allowed outlets.
- Added an outlet selector to the POS and sends `outlet_id` with catalog, quote, and order requests.
- Added validation requiring an outlet assignment for manager, sales, and inventory staff.
- Verified with `GOCACHE=/tmp/avinsmart-go-cache go test ./...` and `npm run build`.

## 2026-09-25 — Run the full sales and inventory happy path

TL;DR: a real PostgreSQL run confirmed billing, order creation, payment completion, stock updates, and inventory movement reconciliation; it also found and fixed one outlet-resolution bug.

- Added `TestSalesAndInventoryHappyPath` to exercise a bill quote, bill creation, order creation, cash payment, final stock quantity, sale ledger entries, and the inventory movements API in one flow.
- Added Docker Compose services for the backend, development PostgreSQL, disposable integration PostgreSQL, and a backend test runner.
- Fixed outlet resolution to select both `id` and `status`; explicit active outlets were previously reported as inactive because the status column was omitted from the query.
- Ran the PostgreSQL integration suite successfully: `TestPOSIntegration`, `TestSalesAndInventoryHappyPath`, and `TestSalaryIntegration` all passed.
- `docker compose config` and `docker compose --profile test config` both validate. Docker execution remains unavailable in this environment because access to `/var/run/docker.sock` is denied; the equivalent temporary local PostgreSQL run passed.

## 2026-09-25 — Inventory movements and outlet transfers (GitHub #8)

TL;DR: every stock mutation now leaves a signed, outlet-aware ledger entry, and transfers move quantities transactionally between outlet stock records.

- Added `inventory_movements` with product, outlet, signed quantity delta, reason, actor, timestamp, and optional source record.
- Sales, opening stock, pending-order cancellation/expiry, and full refunds now write ledger movements in the same transaction as the stock update.
- Added idempotent `POST /api/v1/inventory/transfers` plus movement/transfer listing endpoints.
- Transfers lock source and destination products, reject negative/insufficient quantities, create a destination product record when needed, and write paired transfer-out/transfer-in movements.
- Existing non-zero product quantities are backfilled as opening-stock movements so current stock can be reconciled from the ledger.
- Product SKUs are unique per outlet to support the same catalog item at multiple branches.
- Verified with `GOCACHE=/tmp/avinsmart-go-cache go test ./...` and `npm run build`.

## 2026-09-25 — Assign staff to outlets and enforce permissions (GitHub #7)

TL;DR: outlet assignments are now part of staff management and are checked live for catalog, POS, reports, and manager administration.

- Staff registration and editing accept one or more active `outlet_ids`; manager, sales, and inventory roles require an assignment.
- Staff login/list responses include outlet assignments, and the frontend registration/edit screens let administrators choose branches.
- Managers can list, update, reset, or delete only staff whose assignments overlap their own outlets; assignment changes are validated against the manager's current access.
- Outlet listing is scoped to managers' assignments, while creating a new outlet requires an admin to avoid managers granting themselves new authority.
- POS uses the staff member's current assignments and the backend re-checks them for every request, so removing access takes effect immediately.
- Verified with `GOCACHE=/tmp/avinsmart-go-cache go test ./...` and `npm run build`.

## 2026-09-25 — Release stock for cancelled or abandoned orders (GitHub #3)

TL;DR: pending orders now reserve stock only until they are paid, explicitly cancelled, or automatically expired; every release is transactional and idempotent.

- Added a 30-minute `expires_at` deadline and `cancelled_at` timestamp to orders.
- Added `POST /api/v1/orders/{id}/cancel`; the POS Clear button cancels the server order before clearing its local cart.
- Cancellation locks the order and its items, restores every reserved product quantity, and then changes the status. Repeating cancellation does not restore stock twice.
- Paid orders return a conflict and cannot use the pending-order cancellation path.
- Added a small background expiry worker and an expiry check before accepting a payment, so abandoned orders release stock even if the browser disappears.
- Product rows are locked in stable ID order during release to reduce concurrent-order deadlock risk.
- Verified with `GOCACHE=/tmp/avinsmart-go-cache go test ./...` and `npm run build`.

## 2026-09-25 — Exact sales money and selected bill totals (GitHub #4)

TL;DR: the sales paths now use exact decimal INR values and one shared pricing calculation; this pass adds regression coverage and documents the rounding contract.

- Confirmed products, orders, order items, payments, bills, and bill items use `money.Amount`, which serializes decimal strings and rejects values with more than two paise.
- Confirmed orders and bills both calculate through `pricing.Build`, so wholesale/customer-display/bought totals cannot silently fall back to the customer-display amount.
- Added a bill quote regression test with different price tiers to prove wholesale `90.00 × 2` produces a `180.00` final total.
- Documented decimal-string inputs and one-time half-away-from-zero tax rounding in `backend/README.md`.
- Existing exact `0.10 + 0.20`, fractional-tax, and order payment arithmetic tests remain green.
- Verified with `GOCACHE=/tmp/avinsmart-go-cache go test ./...`.

## 2026-09-25 — Choose the canonical POS sale flow (GitHub #5)

TL;DR: `/api/v1/orders` is now the documented canonical POS flow; `/api/v1/bills` stays compatible for existing invoice clients but clearly advertises its successor.

- Declared orders as the owner of POS stock reservation, outlet scope, partial payments, cancellation, expiry, and payment state.
- Added `Deprecation: true`, `X-Canonical-Sale-Flow`, and `Link` successor headers to the legacy bills route.
- Documented the migration contract in `backend/README.md`.
- Renamed the admin sidebar entry to `Legacy Bill` and added an in-page migration notice, while keeping old invoice clients working.
- Both flows already use the shared `pricing.Build` calculation, so the legacy path cannot silently use a different selected-tier calculation.
- Verified with `GOCACHE=/tmp/avinsmart-go-cache go test ./...` and `npm run build`.

## 2026-09-25 — Cash change, cancellation, and refunds (GitHub #6)

TL;DR: cash payments now record tendered cash/change, manager/admin users can refund payments with an audit trail, and sales reports expose gross, payment, refund, and net totals.

- Added exact `cash_tendered` and `change_given` fields to payments; cash requires tendered cash at least as large as the applied amount, while card/UPI reject cash fields.
- Added `POST /api/v1/orders/{id}/payments/{payment_id}/refund` with a required reason, refund timestamp, and refunding principal. The route is limited to managers and admins.
- A partial refund reopens the order balance without returning stock. When every payment is refunded, stock is returned once and the order becomes `refunded`.
- Added `GET /api/v1/orders` with outlet-scoped report totals for gross sales, applied payments, refunds, cash tendered, change, and net collected.
- Updated the POS to capture cash tendered and show change to the cashier.
- Verified with `GOCACHE=/tmp/avinsmart-go-cache go test ./...` and `npm run build`.

## 2026-09-25 — Add end-to-end POS integration coverage (GitHub #9)

TL;DR: the critical POS paths now have an opt-in PostgreSQL integration suite covering retries, races, rollback, outlet isolation, and exact payment completion.

- Added `backend/internal/integration/pos_test.go` with disposable-database fixtures for duplicate order/payment requests, concurrent payments, failed-order stock rollback, cross-outlet access, and partial-payment balances.
- The tests exercise the real router, authentication middleware, GORM transactions, idempotency records, stock updates, and money serialization instead of mocking those boundaries.
- Added `TEST_DATABASE_URL` instructions to `backend/README.md`; the suite skips cleanly when PostgreSQL is not configured, while the normal unit suite remains available.
- Verified compilation with `GOCACHE=/tmp/avinsmart-go-cache go test ./...`; execution of the PostgreSQL cases requires a reachable test database.

## 2026-09-25 — Make deployment and browser sessions configurable (GitHub #10)

TL;DR: production now requires an explicit JWT secret and CORS allow-list, the frontend API target is environment-configurable, and admin/POS logouts no longer share a token.

- Added `APP_ENV`, `CORS_ALLOWED_ORIGINS`, `JWT_SECRET`, and `JWT_EXPIRY_HOURS` configuration with startup validation that rejects the development secret in production.
- CORS now uses the configured origins, varies responses by origin, and includes `Idempotency-Key` for POS preflight requests.
- Production builds use same-origin `/api/v1` by default; separate deployments can set `VITE_API_BASE_URL`, while local Vite development keeps the localhost backend default.
- Replaced hard-coded API URLs in the retained legacy scripts with a runtime override and same-origin fallback.
- Admin and POS tokens use separate storage keys and API clients; leaving a POS counter cannot remove the administrator session.
- Documented deployment/session settings in `backend/README.md` and added config/CORS regression tests.
- Verified with `GOCACHE=/tmp/avinsmart-go-cache go test ./...` and `npm run build`.

## 2026-09-25 — Make payroll production-backed (GitHub #11)

TL;DR: salary management is now a real, authorized payroll workflow with exact money, configurable calendars, transactional summaries, audit history, idempotent writes, and a dynamic frontend.

- Changed salary amounts from floating point to exact decimal strings with two-decimal validation; approved currencies are INR, USD, EUR, and GBP, with one consistent currency per pay period.
- Added salary create/edit/pay endpoints, paid-record immutability, payment method/reference fields, field validation, and manager/admin authorization scoped to assigned outlets.
- Added persisted payroll calendars and public holidays; default working days exclude weekends, public holidays reduce the configured count, and payroll prorates fixed monthly salary by present plus approved paid-leave days.
- Added UTC date/month validation, future-date rejection, duplicate leave protection, leave approval metadata, and a durable payroll audit table for salary, attendance, leave, calendar, and payment changes.
- Added idempotency protection to every mutating salary, attendance, leave, and calendar route, plus a transactional `/salaries/summary` endpoint and administrator audit endpoint.
- Rebuilt the salary screen with dynamic month selection, salary create/edit/pay forms, backend working-day/calendar controls, public-holiday management, exact currency formatting, loading/retry/error states, duplicate-submit protection, and confirmation for irreversible actions.
- Added salary integration coverage for authorization, idempotent creation, paid-row immutability, attendance validation, duplicate leave, and summary behavior; PostgreSQL cases run when `TEST_DATABASE_URL` is configured.
- Verified with `GOCACHE=/tmp/avinsmart-go-cache go test ./...` and `npm run build`.

## 2026-10-02 — Isolate staff POS sessions by browser tab

TL;DR: staff profiles and POS tokens now share the same tab-scoped storage, while admin and staff login/logout flows no longer erase each other's active sessions across tabs.

- Fixed the intermittent `bearer token is required` error that appeared when the POS page retained its tab-scoped staff profile after another admin flow deleted the globally stored POS token.
- Moved the POS bearer token from shared `localStorage` to `sessionStorage`, matching the existing staff profile lifetime and preventing one tab from invalidating another POS tab.
- Changed staff login and logout to preserve administrator credentials, and changed the shared sidebar logout to clear only the session type currently using that sidebar.
- Kept admin login cleanup limited to the current tab's POS session, with one-time removal of the legacy local-storage POS token.
- Added a `/pos` route guard and an in-page guard that both require a valid staff profile and POS token before rendering the counter.
- Made protected-route selection prioritize the current tab's staff session so a shared administrator token cannot silently elevate a staff tab.
- Verified with `npm run build` and the backend test suite.
