# VoiceStock AI — Frontend

Multilingual, voice-first inventory management for Indian kirana shops.
React 18 · Vite 6 · TypeScript (strict) · Tailwind CSS · shadcn/ui-style components (Radix) · React Router 6 · TanStack Query 5 · React Hook Form + Zod · Recharts · Lucide · Axios.

## Status (this delivery: Phase A + product management)

| Area | Status |
|---|---|
| Design tokens, UI kit, app shell (collapsible sidebar, top bar, mobile bottom nav + "More") | Done |
| Auth: login, register, forgot/reset password, route guards, session-expiry handling | Done |
| Shop onboarding (3 steps: details → languages → inventory preferences) | Done |
| Dashboard (summary, trend chart, low stock, recent movements, frequent, reorder, quick actions) | Done |
| Products: list (search/filter/sort/paginate, URL-synced), create/edit, detail + history, archive | Done |
| i18n: Telugu (complete, build-enforced) + English; Hindi registered but disabled until reviewed | Done |
| Typed services for auth, shop, product, inventory, voice, alerts, reports | Done |
| Add Stock, Record Sale, Remove Stock, Correct Stock (review → confirm → server result) | Done (usability pass) |
| Check Stock, Low Stock, Stock History (filters, "Correct this") | Done (usability pass) |
| Voice assistant: MediaRecorder capture, capability-driven languages, review/clarify/confirm, typed fallback | Done (usability pass) |
| Offline banner + offline write blocking; translated error messages | Done (usability pass) |
| Suppliers, reports, team, settings | Phase D (placeholders) |

## Getting started

```bash
cp .env.example .env          # set VITE_API_BASE_URL
npm install
npm run dev
```

### Development mock mode (opt-in)
Set `VITE_USE_MOCK_API=true` in `.env` and run `npm run dev`. An amber banner shows on every screen, sample records are prefixed `[MOCK]`, and data lives in `sessionStorage` for that tab only.
Mock mode is **hard-disabled in production builds** (`import.meta.env.DEV` guard) and the adapter is dynamically imported, so it is not in the production bundle. There is no silent fallback: if the API is down, screens show error states with retry.

### Scripts
`npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint` · `npm test`

## Architecture

```
src/
  app/            providers, router (route-level code splitting)
  components/
    ui/           design-system primitives (button, card, dialog, table, form-field…)
    layout/       app shell, sidebar, top bar, mobile nav, nav config
    common/       page header, empty/error states, pagination, mock banner
    inventory/    stock badges, movement list, product form + archive dialogs
    charts/       Recharts wrappers with screen-reader data tables
    voice/ alerts/  (Phase C/D)
  features/       auth, shops, products, dashboard, i18n: providers, queries, schemas
  pages/          route components
  services/       one typed module per backend domain
  lib/            api-client, api-error, query-client (+ key factory), env, format, validation, mock/
  types/          request/response models
  locales/        en (source of truth), te, hi
  tests/          vitest unit tests
```

## Backend contract (FastAPI, `/api/v1`)

Auth uses **HTTP-only cookies**; the frontend never sees or stores tokens or passwords.
- Unsafe requests send `X-CSRF-Token`, read from the `csrf_token` cookie (double-submit).
- On `401` the client calls `POST /auth/refresh` once (single-flight) and retries; if that fails the session is cleared and the user is sent to sign in.
- The active shop is sent as `X-Shop-ID`. **The backend must verify membership**: the header is a hint, not authorisation.
- Stock writes send `Idempotency-Key`. Create one key per user intent and reuse it on retry. `GET /inventory/movements/by-idempotency-key/{key}` resolves unknown outcomes.
- Decimals (quantities, money) are exchanged as **strings**.
- 422 responses in FastAPI's `detail[]` shape are mapped onto form fields. 5xx details are never displayed.

| Method | Path | Notes |
|---|---|---|
| POST | /auth/login, /auth/register | returns `CurrentUser` and sets cookies |
| POST | /auth/logout, /auth/refresh | |
| GET | /auth/me | includes `memberships` and `permissions` for the active shop |
| POST | /auth/forgot-password, /auth/reset-password | |
| GET/POST | /shops · PATCH /shops/{id} | |
| GET | /products?search&category_id&stock_status&status&sort&order&page&page_size | `Paginated<Product>` |
| POST | /products · GET/PATCH /products/{id} · POST /products/{id}/archive | create/update never include stock; base unit is immutable after create |
| GET | /products/{id}/movements · /products/{id}/conversions | |
| GET | /categories · /units · /suppliers | |
| POST | /inventory/stock-in · /inventory/stock-out · /inventory/adjustments | idempotent |
| GET | /inventory/movements | filters: product_id, movement_type, source, date_from, date_to |
| GET | /dashboard/summary · /dashboard/movement-trend?days · /reports/frequent-products | |
| GET | /alerts/low-stock · /alerts/reorder-suggestions | suggestions carry `basis: threshold \| forecast` plus an explanation |
| POST | /voice/transcribe (multipart) · /voice/interpret · /voice/confirm · /voice/speak | Phase C |

Permission codes used for UI visibility (the backend still enforces them): `product:write`, `inventory:write`, `inventory:adjust`, `team:manage`.

## Principles baked in
- No fabricated metrics: empty states guide first-run users instead of showing zeros or invented trends.
- Product edits cannot change stock. Stock only moves through auditable movement endpoints.
- After any stock mutation, call `invalidateAfterStockChange(productId)` (products, dashboard, movements, alerts).
- Status is never colour-only (icon + text); 44px touch targets; visible focus; reduced motion respected; live regions for async status.

## Usability pass (kirana shopkeepers)

- Everyday words everywhere: Add Stock, Record Sale, Remove Stock, Check Stock, Low Stock, Stock History, Correct Stock. Sidebar groups them under "Daily tasks"; phones get a bottom bar (Home · Stock · Speak · History · More) and the six action tiles come first on Home.
- Every stock change follows form → review (now / change / after, with pack-size conversion shown) → big confirm → server result. Success shows the server's balance, reference and time only.
- Mistakes are fixed with Correct Stock (a counted-quantity adjustment). Entries are never edited or deleted.
- Unknown outcomes (connection drops mid-save) show "We are not sure if this was saved" with Check / Try again. Both reuse the same idempotency key, so nothing is counted twice.
- 48px inputs on phones, a 56px quantity stepper, radio cards for reasons, a labelled language button showing the language's own name, `translate="no"` + `dir="auto"` on product names, an offline banner, and a confirm prompt before discarding product edits.
- Voice never claims a language: the speech-language list comes from `GET /voice/capabilities`. The mic is disabled with an explanation when the service, browser or language is unavailable, and typed commands plus form shortcuts stay available.

### Adding a language
Create `src/locales/<code>.ts` (type it as `Dictionary` to make the build enforce completeness), add the code to `LanguageCode`, register it in `src/locales/index.ts`, and set `enabled: true` after native review. `tests/i18n.test.ts` checks key and placeholder parity.

## Backend endpoints the frontend still needs

| Endpoint | Why |
|---|---|
| `GET /voice/capabilities` → `{speech_to_text:{available,languages[]}, text_to_speech:{available,languages[]}, max_recording_seconds}` | New. Drives which speech languages are offered. |
| `POST /voice/transcribe` (multipart `audio` webm/mp4/ogg + `language_hint`) | Speech-to-text via your provider. |
| `POST /voice/interpret` (`text`, optional `transcript_id`, `input: speech\|typed`) | NLU; must return product candidates, quantity, unit, current/proposed stock, warnings, clarification question (localised via Accept-Language). |
| `POST /voice/confirm` (Idempotency-Key) → `StockMovement` | Commits a reviewed voice command; must revalidate balance and permissions. |
| `POST /voice/speak` → audio blob | Optional TTS. |
| `POST /inventory/stock-in`, `/stock-out`, `/adjustments` (Idempotency-Key) → `StockMovement` | Must reject negative balances server-side and replay the same result for a repeated key. |
| `GET /inventory/movements/by-idempotency-key/{key}` → movement or 404 | Resolves "not sure if saved" (manual and voice). |
| `GET /inventory/movements` with `source`, `movement_type`, `product_id`, `date_from`, `date_to` | Stock History filters. |
| `GET /products/{id}/conversions` | Product pack sizes (e.g. 1 bag = 50 kg). The frontend never sends factors. |
| `Accept-Language` support | Localised `detail` messages, unit names, clarification questions. |
| `permissions` on `/auth/me` incl. `inventory:write`, `inventory:adjust` | Controls which actions are shown (backend still enforces). |
