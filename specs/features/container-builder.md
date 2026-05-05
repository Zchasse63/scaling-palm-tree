# Feature Design Document — Servous Container Builder

**Feature slug:** `container-builder`
**Analyst:** qa-analyst
**Date:** 2026-05-04
**App URL:** http://localhost:3000
**Stack:** Next.js 16 (App Router) + React 19 + Tailwind v4 + Supabase Auth + Netlify

---

## 1. Application Overview

The Servous Container Builder is a customer-facing web app for ordering international shipping containers (40HC) filled with Servous products. A provisioned customer logs in via Supabase magic link, sees a product catalog, adds quantities to line items, and submits a full-container order that writes to `customer_orders` + `customer_order_lines` in Supabase.

The app is intentionally minimal: no self-signup, no payment, no inventory. It is a quoting/ordering surface — the output is a "quoted" order record that Servous staff will confirm.

---

## 2. Route Map

| Route | Auth Required | Description |
|---|---|---|
| `/signin` | No | Magic-link sign-in form. Redirects to `/` if already signed in. |
| `/auth/callback` | No | Supabase token exchange (PKCE `code` or `token_hash`). Sets session, redirects to `next` (clamped to same-origin). |
| `/` | Yes | Smart landing: auto-resolves single catalog to builder, or renders catalog selector for multi-catalog users. 404-equivalent for zero-access users. |
| `/?c=<slug>` | Yes | Builder for a specific catalog by customer-scoped slug. Invalid slug → redirect to `/`. |
| `/orders` | Yes | Order history table. |
| `/signout` | Yes (route only) | GET clears session, redirects to `/signin`. |

**Legacy redirects** (middleware or page-level):
- `/build?catalog=<uuid>` — not yet wired; test whether it 404s or redirects.
- `/catalogs` — old route that existed in early architecture; test whether it 404s or redirects.

---

## 3. Auth Model

- **Provider:** Supabase Auth, magic link only.
- **Sign-in:** Customer enters email → `sendMagicLink` server action → Supabase sends email → `/auth/callback?token_hash=<hash>&type=magiclink` → session set.
- **Session:** Stored in Supabase SSR cookies. Middleware refreshes on every request.
- **Middleware protection:** `PUBLIC_PATHS = {"/signin", "/auth/callback"}`. Any other path: if `auth.getUser()` returns null → redirect to `/signin?next=<original>`.
- **Profile resolution:** `requireSession()` resolves `auth.users.id` → `customer_user_profiles.company_id` → `companies.name`. Unauthenticated: redirect `/signin`. Authenticated but not provisioned: redirect `/signin?error=not_provisioned`.
- **Open-redirect protection:** `safeNext()` in `auth/callback/route.ts` requires leading `/`, rejects `//`, rejects control chars, rejects `/auth/` prefix.

**Test customer:**
- Email: `zchasse@atyourservous.com`
- `auth.users.id`: `d4dc3c21-4e94-4e76-8944-eaa825977d0b`
- `companies.id`: `68f5af45-d9b2-4f74-83c0-3275df0d6fa1`
- Catalog: `foil-aluminum` slug, Whitestone vendor (`2c1c07d7-4d90-4b9d-b952-796f2c91285d`), 18 SKUs, 40HC, DDP to customer dock, 18% margin.

**Auth test pattern:** Supabase Admin API `generate_link` → `hashed_token` → visit `/auth/callback?token_hash=<hashed_token>&type=magiclink` in Playwright. No email round-trip needed.

---

## 4. Builder — Core Workflows

### 4.1 Catalog Loading

On `/` with a single catalog:
1. `requireSession()` → `fetchCustomerCatalogs()` → one entry.
2. `resolveCustomerCatalogAccess()` by slug.
3. `fetchCatalogForVendor()` → `catalog_for_customer` view with `vendor_id` filter.
4. `BuilderClient` rendered with `catalog`, `customerName`, `otherCatalogs`.

### 4.2 Quantity State

- `qtys: Record<vendorProductId, number>` in React state, starts empty.
- Each `ProductRow` contains a `Stepper` component.
- Changes propagate up via `setQtys`.
- `computeTotals(catalog, qtys)` runs on every render — cheap O(skus) loop.

### 4.3 Stepper Behavior

- `packMultiple` (from DB `metadata->>'pack_multiple'`): foil rolls = 200, most SKUs = null (step 1).
- `minCaseQty`: catalog-wide minimum per line item. Default 100.
- `effectiveMin = ceil(max(packMultiple, minCaseQty) / packMultiple) * packMultiple`
- Increment: 0 → `effectiveMin`; otherwise `value + step`.
- Decrement: at or below `effectiveMin` → 0; otherwise `value - step`.
- Decrement button disabled at `value === 0`.
- **Input box:** allows any typing; on `blur` → `parseInt()` → snap to multiple → enforce min. If invalid → 0. If typed 50 for a foil-roll (packMultiple=200): snaps to 0 if `50 <= 100` (200/2=100) or snaps to 200 otherwise.
- **Arrow keys:** ArrowUp increments, ArrowDown decrements, respecting `step` and min.

### 4.4 Progress Bars and Totals

- **Volume fill:** `fillFraction = sum(qty / casesPer40hc)`. `volPct = fillFraction * 100`.
- **Weight:** `kg = sum(qty * caseWeightKg)`. `wtPct = (kg / container.weight_max_kg) * 100`.
- `container` for `40HC`: `cbm = 76.0`, `weight_max_kg = 26500`.
- `belowMinLines`: count of lines where `qty > 0 && qty < effectiveMin`.

### 4.5 Submit Gate (Client-Side)

`submittable` is true only when ALL:
1. `cases > 0` (non-empty cart)
2. `volPct >= minFillPct - 0.05` (meets minimum fill, default 100%)
3. `volPct <= 100 + 0.001` (not over volume)
4. `wtPct <= 100 + 0.001` (not over weight)
5. `belowMinLines === 0` (no below-minimum lines)
6. `!pending`

**Server-side revalidation** in `submitOrderAction`:
- Re-fetches session and catalog.
- Recomputes totals from server-side data.
- Refuses if `volPct < minFillPct - 0.05` or `volPct > 100.05` or `wtPct > 100.001` or `belowMinLines > 0` or `cases === 0`.

### 4.6 Order Submission

1. `onSubmit()` → `useTransition` → `submitOrderAction({ vendorId, qtys })`.
2. Server: verify session, verify catalog access, re-compute totals, validate gates.
3. Generate `order_number = SVS-XXXXXX` (sequential, looks at last 50 orders).
4. Insert `customer_orders` row.
5. Insert `customer_order_lines` rows.
6. On success: `setSubmittedOrderNumber` → `OrderConfirmation` renders.
7. On error: `setError` → error banner shows.

**Idempotency concern:** `order_number` has a UNIQUE constraint on the `customer_orders` table. Rapid double-submit could generate the same order_number (race condition in `nextOrderNumber()` which reads last 50 and increments — not an atomic sequence). This is a documented risk.

### 4.7 Optimize Fill

Three modes computed entirely client-side via `optimizeFill()`:

| Mode | Candidates | Behavior |
|---|---|---|
| `top_up` | SKUs already in cart (qty > 0) | Fill remaining space proportionally, largest-step first |
| `complete_set` | SKUs that complement cart items (pan↔lid matching) | Match qty of the existing item |
| `fill_catalog` | All catalog SKUs | Fill remaining space from anything |

All modes respect:
- `casesPer40hc` proportional fill limit (target = 1.0)
- `weight_max_kg` ceiling
- `packMultiple` step
- `firstAddMin = ceil(max(packMultiple, minCaseQty) / packMultiple) * packMultiple`
- Weight-unaudited SKUs (`caseWeightKg === null`) are **skipped**

"Apply Suggestions" calls `onApplyOptimize(result.projected)` → `setQtys(projected)`.

Statuses: `exact` | `weight_capped` | `no_change` | `partial`.

---

## 5. DOM Selectors (from source code inspection)

The live app was not navigated during analysis (Playwright MCP exploration is a Phase 1 task for the Engineer). Selectors below are derived from source code and should be verified with DOM inspection during test implementation.

### Sign-In Page (`/signin`)
- Email input: `input[type="email"]` (inside `sign-in-form.tsx`)
- Submit button: `button[type="submit"]` with text "Send sign-in link"
- Error display: element showing `error` from `useActionState`

### Builder Page (`/`)
- Header: element with Wordmark, customer name
- Category section: repeating element per product category
- Product row: per-SKU row containing SKU name, pack description, sell price, stepper
- Stepper group: `[role="group"][aria-label="Quantity"]`
- Stepper minus button: `button[aria-label="Decrease"]`
- Stepper plus button: `button[aria-label="Increase"]`
- Stepper input: `input[type="number"]` within stepper
- Summary panel: `aside` element (sticky right column)
- Volume fill pct display: stat element within aside
- Weight pct display: within aside
- Optimize Fill button: `button` with text "Optimize Fill"
- Submit button: `button` with text "Submit Container Order"
- Error banner (on failed submit): element with burgundy background text

### Optimize Modal (`role="dialog"`)
- Modal: `[role="dialog"][aria-modal="true"]`
- Modal title: `#opt-title`
- Tab buttons: `[role="tab"]` elements ("Top up cart", "Match items", "Fill from catalog")
- Apply button: `button` with text "Apply Suggestions"
- Cancel button: `button` with text "Cancel"
- Status line: in `SectionBar` meta slot

### Orders Page (`/orders`)
- Header "Order History"
- Table rows with order number, date, catalog, container, lines, cases, total, status
- "Build a Container" button → `/`

### Order Confirmation (rendered within builder after submit)
- Order number display
- "Back to builder" or equivalent button

---

## 6. Data Flows and Invariants

### Critical Mathematical Invariants
1. `fillFraction = sum(qty_i / casesPer40hc_i)` across all non-zero lines.
2. `volPct = fillFraction * 100`. Submit allowed only when `99.95 <= volPct <= 100.05`.
3. `wtPct = totalKg / 26500 * 100`. Submit blocked when `> 100.001`.
4. `belowMinLines` counts lines where `qty > 0 && qty < effectiveMin(packMultiple, minCaseQty)`.
5. Foil rolls: `packMultiple = 200`, so `effectiveMin = ceil(max(200, 100) / 200) * 200 = 200`.

### Server-Side Revalidation
- All submit-gate rules are enforced **server-side** in `submitOrderAction`. Client-side gate is UX only — it can be bypassed by a crafty caller, but the server will refuse.
- Session is re-checked in every Server Action. No client-supplied `userId` is trusted.

### Catalog Access Enforcement
- Middleware gates every non-public path on Supabase session.
- `requireSession()` resolves session → `customer_user_profiles` → company. No profile → redirect `/signin?error=not_provisioned`.
- `resolveCustomerCatalogAccess()` gates by `customer_id + slug + is_active`.
- `verifyCustomerCatalogAccess()` gates by `customer_id + vendor_id + is_active` in Server Action.

### Open Redirect Defense
- `safeNext(raw)`: rejects if not starting with `/`, if second char is `/`, if contains control chars, if starts with `/auth/`.
- Clamps to `/` in all rejection cases.

---

## 7. Identified Risk Areas

### High Risk
1. **Double-submit race:** `nextOrderNumber()` is not atomic (SELECT MAX then INSERT). Rapid concurrent submits could generate the same order number, hitting the UNIQUE constraint. DB will reject one, but the error message shown to the user may not be graceful.
2. **Stepper overflow:** Typing `999999` into a stepper is accepted (max defaults to 99999 in the Stepper component). The `volPct` would be astronomically large. The submit button should be disabled, but the progress bar rendering at 999999% is untested.
3. **Below-min edge case:** Typing `50` in a foil-roll field (packMultiple=200): on blur, `50 <= 100` (200/2), so snaps to 0. But what if user types exactly `100`? `100 <= 100` → snaps to 0. Typing `101` → snaps to `200`. This is a 0-or-200 cliff with no feedback at 100.
4. **Auth callback with garbage token:** Should redirect to `/signin?error=callback_failed`. Verify Supabase error handling actually returns 302 not 500.
5. **`?c=does-not-exist` slug:** `resolveCustomerCatalogAccess()` returns null → `redirect("/")`. But the redirect is to `/` which tries to auto-resolve again without a slug. If the customer has exactly one catalog, they end up in the builder. If zero, they see NoAccessView. Test that this doesn't loop.
6. **Submit gate bypass via direct action call:** The server enforces all gates. But we should verify by calling the action with `volPct < 100` data (if feasible via form manipulation).

### Medium Risk
1. **Optimize → Submit race:** Apply Optimize updates qtys in React state. If Submit is clicked immediately after Apply (before React has re-rendered and re-computed totals), could the stale totals let a malformed submit through? Unlikely given React 19 synchronous state, but worth testing.
2. **Duplicate optimize application:** Applying Optimize twice in a row with no cart changes — should produce `no_change` status on the second call since `remainingFill <= EPSILON` after first apply.
3. **Weight-capped optimize:** If current cart is weight-capped, `optimizeFill` should immediately return `no_change`/`weight_capped`. The modal should show the "weight ceiling" message.
4. **Orders page shows order just submitted:** DB write is synchronous (Server Action awaits insert). Navigating to `/orders` should immediately show the new order.
5. **Sign out → back button:** Browser may serve the `/` page from cache after sign-out. Middleware should redirect on next request, but the initial cached render may flash.

### Low Risk
1. **Multiple rapid Optimize mode switches:** Each switch triggers a new `useMemo` computation. Should be fine given React 19's strict mode, but test switching between modes rapidly.
2. **Navigation from confirmation to /orders:** Confirm the "View orders" or equivalent CTA on the confirmation screen works.
3. **Long product names:** Truncation via CSS `text-overflow: ellipsis`. Should not break layout.

---

## 8. Open Questions

None. All technical questions are resolved by source code inspection.

---

## 9. Test Approach

Tests will use:
- **Playwright** with **Page Object Model** pattern.
- **Supabase Admin API** for auth fixture (no email round-trip).
- **Supabase service-role key** for DB cleanup after each test that writes an order.
- No `waitForTimeout`. Network idle / `waitForSelector` / `expect().toBeVisible()` instead.
- Selectors verified against the live DOM by the Engineer before being committed to POMs.

The Engineer must run `playwright test` (or relevant subsets) via Playwright MCP, not via shell, so that selector discovery and visual verification happens against the live app.
