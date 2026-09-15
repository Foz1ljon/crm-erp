# Zarafshon Holding — CRM + ERP

A universal CRM + ERP reference build for any industry (services, e-commerce,
manufacturing, B2B sales). Vue 3 + TypeScript + Naive UI + Tailwind v4 + Pinia,
seeded with a full, internally-consistent Uzbek demo dataset.

## What's inside

**CRM:** Leads, Deals (pipeline), Contacts, Activities
**ERP:** Inventory, HR, Finance, Suppliers, Purchase Orders, Logistics
**Shared:** Dashboard (KPIs + charts), Notifications, Settings, RBAC, multi-currency, multi-language, an AI helper

Every module is a full CRUD screen: search, advanced filter drawer, desktop
data table / mobile card list, create modal, delete confirmation — backed by
Pinia stores with a deterministic demo dataset (same data every reload, cross-referenced
by ID so a deal really points at a real customer, a shipment at a real purchase
order, and so on).

## Getting started

```sh
pnpm install   # or npm install
pnpm dev       # or npm run dev
```

Open the printed local URL, sign in with **Demo Admin** or **Demo Manager** on
the login screen (any email/password also works — there's no real backend),
then pick a workspace (CRM or ERP). Switch workspace anytime from the avatar
menu or Settings.

```sh
pnpm build     # type-checks, then builds to dist/
pnpm preview   # serve the production build locally
pnpm lint      # oxlint + eslint --fix
```

## Demo Mode vs Live Mode

Settings → **Data mode** toggles between:

- **Demo Mode** (default) — every module is pre-populated with realistic,
  cross-referenced records (15+ leads, 22 deals, 15+ contacts, 26 activities,
  16 products, 14 employees, 16 transactions, 10 suppliers, 10 purchase
  orders, 12 shipments, 14 notifications).
- **Live Mode** — clears the dataset and shows each module's real empty
  state. There's no backend wired up in this build; this is the seam where
  one would go (`src/stores/*.ts` own the demo/live switch per domain, `src/core/api/`
  is where a real HTTP client would live).

## Languages

Switch from the topbar globe icon or Settings → Language & Currency:

- English
- O'zbekcha (Uzbek, Latin)
- Ўзбекча (Uzbek, Cyrillic)
- Русский (Russian)

Every screen — nav, tables, filters, forms, toasts, validation messages — is
translated (`src/config/i18n/locales/*.json`), including Naive UI's own
components (date picker, pagination) via its locale packs.

## Multi-currency

UZS (Uzbek Som) is the default display currency; USD, EUR, GBP, and JPY are
also available from the currency switcher on the Dashboard or in Settings.
Every amount is stored in its original currency and converted on display, so
switching currency reflows every KPI, chart, and table consistently.

## Role-based access (RBAC)

Two demo roles, switchable in Settings → Role: **Admin** (full access) and
**Manager** (cannot create Inventory/HR/Finance/Supplier/Purchase
Order/Logistics records — those "New" buttons disappear via the `v-can`
directive, `src/core/directives/can.ts`).

## AI Helper

The chat button in the bottom-right corner answers questions grounded in your
live CRM/ERP data (deal counts, low-stock items, finance totals, open POs,
etc. — see `src/core/composables/useAiContext.ts`). It calls the Gemini API
directly from the browser using **your own** API key:

1. Get a key at [aistudio.google.com](https://aistudio.google.com/apikey).
2. Paste it into Settings → AI Helper.

The key is stored only in your browser's local storage and sent directly to
Google — never to any other server, and never hardcoded in this repo.

## Charts

Dashboard and Finance use real charts (Chart.js via `vue-chartjs`): a revenue
trend line, a sales-pipeline bar chart, a revenue-by-branch donut, and
income/expense + expense-by-category bars on the Finance page. Colors and
chart chrome are theme-aware (`src/core/composables/useChartTheme.ts`) and
follow a validated, colorblind-safe palette.

## Project structure

```
src/
  app/            # Layout shell (sidebar, topbar, AI helper widget)
  config/i18n/    # vue-i18n setup + the 4 locale files
  core/           # Composables, directives, theme tokens, chart theming, API client stubs
  router/         # Routes + auth/workspace guards
  stores/         # Pinia stores (one per domain) + deterministic demo-data generators
  types/          # Domain models (CRM, ERP, notifications) — industry-agnostic
  views/          # One .vue file per module/screen
```

## Tech stack

Vue 3 (Composition API) · TypeScript (strict) · Vite · Naive UI · Tailwind CSS v4 ·
Pinia + `pinia-plugin-persistedstate` · Vue Router · vue-i18n · Chart.js / vue-chartjs · dayjs

## Deploying

`vercel.json` is included for one-click Vercel deployment (SPA rewrite so
client-side routes resolve correctly on refresh/direct link).
