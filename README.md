# Awl Lahza — menu and orders

A web application built with Node.js, a Python catalog importer, and MySQL. The source restaurant's navy/gold/red design, logo, fonts, bilingual copy, ingredients, prices, calories, and emoji illustrations are retained.

## Included

- 26 source products in 6 categories and 42 priced options, including cheese and small drinks.
- English and Arabic only. First visit follows the browser's preferred language; an explicit language choice is remembered. Arabic uses RTL layout.
- Product cart icons, quantity controls, itemized totals in SAR, and no additional charges.
- Pickup and dine-in with a manually entered table number; first name, last name, phone, and cash payment.
- Unique order numbers and private tracking links. Orders begin **awaiting restaurant approval**, then progress through **preparing → ready → collected**, or are declined/cancelled.
- Customer status polling every 5 seconds; administrator order polling every 8 seconds.
- Password-protected administration for orders, product names/descriptions/ingredients/notes, option prices/calories, availability, and order hours.
- Daily order window **16:30–02:00, Asia/Riyadh**. The server enforces the window across midnight.
- Actual MySQL persistence, server-side pricing, transactional order creation, idempotency, hashed administrator passwords, expiring database sessions, and origin checks.

## This computer

The project-local MySQL 8.4.8 distribution is installed under `.runtime/mysql/` and listens only on `127.0.0.1:3307`. No Windows service was installed. Node.js is available on the computer; the Python importer was executed using the bundled Python 3.12 runtime.

- Customer menu: http://127.0.0.1:3000
- Administrator: http://127.0.0.1:3000/admin
- Local administrator credentials: `.runtime/admin-access.txt` (ignored by Git).
- Database credentials: `.env`; local root password: `.runtime/mysql-root-password.txt` (both ignored by Git).
- Local preview runs with `TEST_MODE=true`. Test orders are visibly labeled and must not be treated as restaurant orders.

To restart after closing the application or rebooting, open PowerShell in this folder and run:

```powershell
./scripts/start-project.ps1
```

To run the Node.js server in the foreground after MySQL is already running:

```powershell
npm start
```

The portable MySQL binary is not committed. To set up this same local Windows arrangement on another machine, extract the official `mysql-8.4.8-winx64.zip` into `.runtime/mysql/`, then run `scripts/start-project.ps1`. Node.js 22+ is required. Alternatively use Docker below.

## Other machines / MySQL installation

1. Install Node.js 22+, Python 3.12+, and MySQL 8.4.
2. Create an empty `awllahza` database with `utf8mb4`, and a dedicated application account authorized for that database.
3. Copy `.env.example` to `.env` and set the database connection and exact `APP_ORIGIN`.
4. Run `npm ci`, then `npm run db:setup` **once** to create the schema and import the source snapshot.
5. Create an administrator using environment variables (a password of at least 12 characters):

```powershell
$env:ADMIN_USERNAME = 'restaurant'
$env:ADMIN_PASSWORD = 'choose-a-unique-long-password'
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
```

6. Run `npm start`.

`db:setup` is an explicit source reimport: it updates product content and prices from `data/catalog.json`. Do not run it routinely after editing products in the admin panel. Existing availability overrides and historical orders are preserved; source-removed products become unavailable. Normal startup does **not** overwrite the current catalog.

## Docker

Docker is optional and was not installed on this computer. The provided files support a separate server deployment:

```sh
# Fill .env from .env.example; set a unique MYSQL_ROOT_PASSWORD too.
docker compose up -d --build
# Create the administrator; keep the password out of shell history where possible.
docker compose exec -e ADMIN_USERNAME=restaurant -e ADMIN_PASSWORD app npm run admin:create
```

The image includes Node.js and Python. MySQL data lives in the persistent `mysql_data` volume. The app initializes a **new** schema on first startup only. The public port binds to loopback by default.

## Public deployment

No public deployment, DNS change, paid server purchase, or replacement of `awllahza.com` has been made. A destination host and domain access are still needed.

For HTTPS with the supplied Caddy configuration, set `APP_DOMAIN` to the selected domain and `APP_ORIGIN=https://that-domain`, `NODE_ENV=production`, `TEST_MODE=false`, and `ORDERING_ENABLED=true`. Point that domain to your server, then run:

```sh
docker compose -f compose.yml -f compose.production.yml up -d --build
```

Only Caddy exposes ports 80/443; MySQL is not published. Use a fresh production database/account, create the restaurant administrator, and keep a backup of the MySQL volume. Do not deploy `.runtime/`, local credentials, or test orders. The IP throttle uses one trusted reverse proxy only in this production compose configuration.

## Source import and provenance

```sh
python scripts/import_menu.py          # repeatable import from the saved HTML
python scripts/import_menu.py --fetch  # fetch a fresh source snapshot explicitly
```

The importer parses a restricted data literal without executing third-party JavaScript. Original HTML is stored in `data/source/index.html`; normalized data and SHA-256 provenance are in `data/catalog.json`.

- The source publishes all 26 products without a distinct active/inactive flag. Imported products start active and can be disabled in admin.
- The source uses emoji product illustrations, not product photographs.
- 16 alternative options have no separate calorie figure. These remain unknown rather than invented; the base product calorie value is retained and labeled.
- Some products have a description but no distinct ingredients field; no extra ingredients were inferred.
- Product edits are managed locally through MySQL. There is no automatic synchronization that could overwrite restaurant edits.
- Source Google Fonts are stored locally in `public/assets/`; source URLs remain documented in `data/source/index.html`.

## Verification

```sh
npm test
```

For MySQL integration tests, provision a separate database ending in `_test`, grant the test account access, and set `MYSQL_TEST_DATABASE` if its name is not `awllahza_test`:

```powershell
# Helper only for the project-local Windows MySQL setup:
node --env-file=.env scripts/provision-test-db.js
npm run test:integration
```

The integration runner starts its own server on an OS-assigned port and uses an isolated schema. It verifies double submission, immutable historical prices, protected admin endpoints, order tracking without contact disclosure, status transitions, catalog editing, cash/table validation, UTC timestamp transport, and closed-order enforcement. Do not point tests at the restaurant database.

The customer checkout → restaurant accept → restaurant ready → Arabic customer tracking flow was also exercised through the browser against the isolated test database.

## Menu and pending-order updates

Cart quantities and cheese toggles update in place while retaining checkout fields. Full published ingredients are visible under each dish; the footer embeds the restaurant map. Optional order notes (up to 1,000 characters) appear in customer tracking and admin.

Customers can edit items, quantities, options and notes, or cancel, before restaurant acceptance. Edits retain the order number. Revision checks and database locks prevent customer changes from racing restaurant acceptance. Validation covers these paths with 13 unit tests and 18 isolated MySQL integration tests.

## Local addresses, notifications and saved orders

In local mode, `localhost` and `127.0.0.1` are accepted on the configured port. Production still accepts only `APP_ORIGIN`. Start the local database and app with `./scripts/start-project.ps1`; open http://localhost:3000/ and http://localhost:3000/admin.

Admin notifications poll a persistent event log every three seconds, including while editing the catalog. Customer creation, edits and cancellation produce separate events and a visible toast. Click **Enable sound** once each time the admin page is opened to allow browser audio. Keep the page open; browser or computer sleep can delay notifications until it resumes.

The originating IP is collected on the server and shown only in admin. Existing orders without an IP show a dash. IP is not an identity: multiple customers can share Wi-Fi or mobile carrier addresses. **My orders** uses private tracking tokens stored in the same browser (up to 100 orders), without exposing other orders on the same IP. Use the same hostname when returning because browsers keep localhost and 127.0.0.1 storage separate. Clearing browser data removes saved links; an existing tracking link can restore an order to the list.

Mobile layouts cover menu, cart, tracking, history and admin in English and Arabic. Verification: 13 unit tests and 18 isolated MySQL integration tests, plus browser checkout/edit/cancel, notifications and saved-order checks.
