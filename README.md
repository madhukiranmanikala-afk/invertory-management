# Inventory Management — Frontend

A frontend-only, multi-role inventory management workspace built with HTML5, CSS3 and vanilla JavaScript (ES6 modules). Chart.js is loaded from the jsDelivr CDN; there are no build steps and no other dependencies.

## Run it

Serve the `public` folder with any static server, then open `/index.html`:

```bash
npx serve public
# or
python -m http.server 8080 --directory public
```

Opening the files directly via `file://` will not work because ES modules and module imports require HTTP.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Owner | owner@demo.com | Owner@123 |
| Product Manager | product@demo.com | Product@123 |
| Sales Manager | sales@demo.com | Sales@123 |
| Stock Manager | stock@demo.com | Stock@123 |
| Purchase Manager | purchase@demo.com | Purchase@123 |
| Order Manager | orders@demo.com | Orders@123 |
| Deactivated | old@demo.com | Old@12345 |

The deactivated account always shows “Account deactivated. Contact the Owner.”

## Structure

```
public/
  index.html          Login screen
  app.html            App shell (sidebar, topbar, routed view)
  favicon.svg         Brand mark used by both screens
  css/                variables, base, layout, components, themes
  js/
    config/           roles.js (role accents, dashboards, nav) and permissions.js
    mock/             In-memory demo data
    components/       sidebar, topbar, table, modal, toast, cards, charts, form, icons
    pages/            login, dashboard, module pages, analytics, reports, common pages
    router.js         Hash router with role guards and a 403 / 404 page
    auth.js           In-memory session mirrored to sessionStorage
    api.js            Single API wrapper over the mock data layer
    preferences.js    Theme, density and role accent
```

## Backend integration

`/public/js/api.js` is the only module that touches data. Each exported function maps to a proposed endpoint (`POST /api/auth/login`, `GET /api/dashboard/:role`, `GET/POST /api/users`, `GET /api/products`, `GET /api/stock`, `GET /api/purchase-orders`, `GET /api/sales`, `GET /api/orders`, `GET /api/reports`, `GET /api/activity`, `GET /api/notifications`, and so on). Replace the mock calls inside these functions with `fetch()` calls and the UI needs no changes. Every call has a simulated 300–600 ms delay and throws a typed `ApiError` (`INVALID_CREDENTIALS`, `DEACTIVATED`, `FORBIDDEN`, `VALIDATION`, `INSUFFICIENT_STOCK`, `NOT_FOUND`) so error states already work.

Permissions are action-level keys (`products.create`, `stock.adjust`, …) defined in `/public/js/config/permissions.js`. The UI hides actions the signed-in role does not hold. These guards are UX only — real enforcement belongs in the backend.

The Owner holds `*.view` for every module but not the matching `*.create` / `*.update` keys, so every module renders read-only for that role. Grant the Owner write access by adding those keys to `ROLE_PERMISSIONS.owner`; the UI and `api.js` both follow the same list.

## Features

- One login screen for six roles; dashboards, sidebar, accent colour and actions follow the role.
- Role isolation with a route guard: opening another role's URL renders `403 — Access denied`, an unknown URL renders `404 — Page not found`.
- The Owner manages accounts and gets read-only visibility into every operational module (Products, Sales, Stock, Purchase, Orders) — marked with a `view` tag in the sidebar and a `Read only` badge in the page header, so no create/edit actions are exposed.
- Owner-only user management with add/edit, reset password, activate/deactivate and a four-step role change flow ending in “Previous access deactivated. New access activated.”
- Reusable data table: search, filters, date range, sortable columns, pagination, CSV export, loading skeleton, empty and error states.
- Products, Sales, Stock (with stock-out limits and required adjustment reasons), Purchase (with receive quantities) and Orders (with status changes) modules.
- Notifications, profile, settings (theme/density/password strength), activity history, help and support.
- Light/dark themes, responsive down to mobile with a hamburger drawer, keyboard-operable modals, visible focus states and aria-live toasts.
