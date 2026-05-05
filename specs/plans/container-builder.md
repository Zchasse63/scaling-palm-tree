# Test Plan — Servous Container Builder

**Feature slug:** `container-builder`
**Architect:** qa-architect
**Date:** 2026-05-04
**Input:** specs/features/container-builder.md

---

## Test Architecture

### Stack
- **Playwright** `@playwright/test` ^1.59.1 with `defineConfig` in `playwright.config.ts`
- **Auth fixture:** `tests/fixtures/auth.ts` — Supabase Admin API `generate_link` → visit `/auth/callback?token_hash=<hash>&type=magiclink`
- **POM layer:** `tests/pages/` — one file per page/major component
- **Spec files:** `tests/e2e/` — grouped by concern

### Directory Layout

```
tests/
├── fixtures/
│   └── auth.ts                    ← Supabase token fixture + cleanup helper
├── pages/
│   ├── SignInPage.ts              ← /signin selectors + actions
│   ├── BuilderPage.ts             ← / + /?c=slug selectors + actions
│   ├── OptimizeModal.ts           ← Optimize Fill modal selectors + actions
│   ├── OrderConfirmationPage.ts   ← post-submit confirmation view
│   └── OrdersPage.ts             ← /orders selectors + actions
└── e2e/
    ├── auth.spec.ts               ← Auth flows (sign-in, guard, redirect, open-redirect)
    ├── builder-happy.spec.ts      ← Happy-path builder workflows
    ├── stepper.spec.ts            ← Stepper edge cases
    ├── optimize.spec.ts           ← Optimize Fill edge cases
    ├── submit-gate.spec.ts        ← Submit gate adversarial tests
    └── orders.spec.ts             ← Order history page
```

### Auth Fixture Design

```typescript
// tests/fixtures/auth.ts
import { test as base, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TEST_EMAIL = 'zchasse@atyourservous.com';

type AuthFixtures = {
  authenticatedPage: Page;
  cleanupOrders: () => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Generate a magic link token via Admin API
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false } });
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: TEST_EMAIL,
    });
    if (error || !data?.properties?.hashed_token) throw error ?? new Error('no token');
    const token = data.properties.hashed_token;

    // Visit the callback — this sets the session cookies
    await page.goto(`/auth/callback?token_hash=${token}&type=magiclink`);
    await page.waitForURL('/');

    await use(page);
  },

  cleanupOrders: async ({}, use) => {
    const createdIds: string[] = [];
    const register = (id: string) => createdIds.push(id);
    await use(register as unknown as () => Promise<void>);
    // Teardown
    if (createdIds.length > 0) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
      await admin.from('customer_order_lines').delete().in('order_id', createdIds);
      await admin.from('customer_orders').delete().in('id', createdIds);
    }
  },
});
export { expect };
```

**Note:** The `playwright.config.ts` must load `.env.local` for env vars to be available. Add at top of config:
```typescript
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
```
And add `dotenv` as a devDependency if not already present (check via `require.resolve`; `@playwright/test` bundles it in some versions).

### DB Cleanup Strategy

Every test that calls `submitOrderAction` (or clicks Submit) must:
1. Capture the returned `orderId` from the confirmation page.
2. After the test, delete `customer_order_lines WHERE order_id = ?` then `customer_orders WHERE id = ?` using the service-role key.
3. The `cleanupOrders` fixture registers IDs during the test for teardown.

---

## Test Cases by Priority

### P0 — Critical Path (must pass for any release)

| ID | Spec File | Name | Description |
|---|---|---|---|
| P0-01 | auth.spec.ts | Magic link sign-in → builder | Token fixture → callback → lands on `/` with catalog loaded |
| P0-02 | auth.spec.ts | Unauthenticated `/` redirect | Visit `/` without session → `/signin?next=%2F` |
| P0-03 | auth.spec.ts | Unauthenticated `/orders` redirect | Visit `/orders` without session → `/signin` |
| P0-04 | builder-happy.spec.ts | Add SKUs → totals update | Add qty to 3 SKUs → volume bar and weight bar update correctly |
| P0-05 | builder-happy.spec.ts | Full container submit → DB write | Fill to 100% via Optimize → submit → confirmation shows order number → DB row exists |
| P0-06 | builder-happy.spec.ts | Orders page shows submitted order | After P0-05, navigate to `/orders` → order appears in table |
| P0-07 | submit-gate.spec.ts | Submit blocked when empty | Cart empty → Submit button disabled |
| P0-08 | submit-gate.spec.ts | Submit blocked when under-filled | volPct < 100% → Submit button disabled |
| P0-09 | submit-gate.spec.ts | Submit blocked when over-filled | volPct > 100% → Submit button disabled |
| P0-10 | submit-gate.spec.ts | Submit blocked when line below min | Line with 0 < qty < effectiveMin → Submit disabled + reason shown |
| P0-11 | auth.spec.ts | Sign out → `/signin` | Click sign-out → redirect to `/signin` |
| P0-12 | auth.spec.ts | Open redirect clamped | `/auth/callback?token_hash=good&type=magiclink&next=https://evil.example.com` → clamps to `/` |

### P1 — High Priority (adversarial + regression-blocking)

| ID | Spec File | Name | Description |
|---|---|---|---|
| P1-01 | submit-gate.spec.ts | Server refuses under-filled submit | Direct action call with volPct < 100 → `ok: false` error |
| P1-02 | submit-gate.spec.ts | Server refuses over-filled submit | Direct action call with volPct > 100.05 → `ok: false` error |
| P1-03 | submit-gate.spec.ts | Server refuses over-weight submit | Direct action call with wtPct > 100 → `ok: false` error |
| P1-04 | submit-gate.spec.ts | Server refuses below-min line | Action call with 1 line at qty=50, foil product with packMultiple=200 → `ok: false` |
| P1-05 | submit-gate.spec.ts | Foil roll snap on blur | Type 50 in foil-roll stepper (packMultiple=200) → blur → snaps to 0 |
| P1-06 | submit-gate.spec.ts | Foil roll non-multiple typed → snaps | Type 100 in foil-roll stepper → blur → snaps to 0 (100 ≤ 200/2) |
| P1-07 | submit-gate.spec.ts | Foil 101 typed → snaps to 200 | Type 101 in foil-roll stepper → blur → snaps to 200 |
| P1-08 | stepper.spec.ts | Type non-numeric → 0 | Type "abc" in stepper input → blur → snaps to 0 |
| P1-09 | stepper.spec.ts | Type negative → 0 | Type "-50" in stepper → blur → 0 |
| P1-10 | stepper.spec.ts | Decrement at 0 → disabled | Stepper at 0 → minus button has `disabled` attribute |
| P1-11 | stepper.spec.ts | Increment past container max → volume capped | Click + until volPct reaches 100% → Submit enabled, further + clicks do not put vol > 100 in a submit-gated way |
| P1-12 | stepper.spec.ts | Type 999999 → accepted but submit blocked | Stepper accepts 99999 (max prop), volPct >> 100, Submit disabled |
| P1-13 | auth.spec.ts | Garbage token_hash → error page | `/auth/callback?token_hash=garbage&type=magiclink` → redirects to `/signin?error=callback_failed` |
| P1-14 | auth.spec.ts | `/?c=foil-aluminum` unauth → `/signin` | Visit `/?c=foil-aluminum` unauthenticated → `/signin` |
| P1-15 | auth.spec.ts | `/?c=does-not-exist` authed → `/` | Auth'd user visits `/?c=does-not-exist` → resolves to builder (no crash, no loop) |
| P1-16 | auth.spec.ts | Sign out → back button → `/signin` | Sign out → browser back → middleware re-redirects to `/signin` |
| P1-17 | optimize.spec.ts | Optimize top_up mode | Add items to cart → open Optimize → top_up → Apply → volPct increases |
| P1-18 | optimize.spec.ts | Optimize fill_catalog mode | Empty cart → open Optimize → fill_catalog → Apply → volPct near 100% |
| P1-19 | optimize.spec.ts | Optimize match_items mode | Add pans → Optimize → complete_set suggests lids |
| P1-20 | optimize.spec.ts | Optimize then Submit | Apply Optimize (fill_catalog) → Submit → success |
| P1-21 | optimize.spec.ts | Optimize twice same cart → no_change 2nd time | Apply → Apply again → 2nd result status is "no_change" or "exact" with no new suggestions |
| P1-22 | optimize.spec.ts | Optimize on empty cart top_up disabled | Empty cart → Optimize opens → top_up tab disabled |
| P1-23 | orders.spec.ts | Orders page — empty state | Fresh auth (no orders) → `/orders` → "No container orders yet" |
| P1-24 | orders.spec.ts | Orders page — order listed | After submit, `/orders` shows correct order number, catalog, status |
| P1-25 | builder-happy.spec.ts | Auto-redirect single catalog | Login → `/` → auto-resolves to builder without `?c=` param |

### P2 — Lower Priority (nice-to-have / UI quality)

| ID | Spec File | Name | Description |
|---|---|---|---|
| P2-01 | stepper.spec.ts | Arrow key increment | Focus stepper input → ArrowUp → qty increases by step |
| P2-02 | stepper.spec.ts | Arrow key decrement | Focus stepper input → ArrowDown → qty decreases or goes to 0 |
| P2-03 | optimize.spec.ts | Optimize weight-capped cart | Manually construct near-weight-capped cart → Optimize → status shows weight_capped |
| P2-04 | submit-gate.spec.ts | Double-click submit | Click Submit rapidly twice → at most one order created |
| P2-05 | builder-happy.spec.ts | Optimize → back to builder → submit | Confirm screen shown → click back → cart is empty |
| P2-06 | auth.spec.ts | `/auth/callback` open redirect via `//` | `/auth/callback?token_hash=good&type=magiclink&next=//evil.example.com` → clamps to `/` |
| P2-07 | auth.spec.ts | `/auth/callback` `/auth/` prefix rejected | `next=/auth/callback` in next param → clamps to `/` |
| P2-08 | builder-happy.spec.ts | Volume bar at 0 → correct label | Empty cart → summary shows "Add cases to start building your container." |
| P2-09 | builder-happy.spec.ts | Volume bar over 100 → burgundy | volPct > 100 → "Over capacity by: X.X% volume" shown in burgundy color |

---

## Test Count Summary

| Priority | Count |
|---|---|
| P0 (critical) | 12 |
| P1 (high) | 25 |
| P2 (lower) | 9 |
| **Total** | **46** |

---

## POM Design

### SignInPage (`tests/pages/SignInPage.ts`)
- `emailInput` — `input[type="email"]`
- `submitButton` — `button[type="submit"]`
- `errorMessage` — element containing error text
- `fillAndSubmit(email)` — action

### BuilderPage (`tests/pages/BuilderPage.ts`)
- `catalogTitle` — heading text element
- `skuRows` — locator for all product rows
- `stepperForSku(vendorProductId)` — returns Stepper sub-locator by `data-sku-id` or row matching
- `minusButton(sku)` / `plusButton(sku)` / `qtyInput(sku)`
- `volPctDisplay` — display text in summary panel
- `wtPctDisplay` — display text
- `submitButton` — `button` with text "Submit Container Order"
- `optimizeButton` — `button` with text "Optimize Fill"
- `submitErrorBanner` — burgundy error block
- `disabledReason` — mono caption under submit button
- `getQty(sku)` — returns parsed int from input
- `setQty(sku, n)` — clear + fill input, then blur
- `clickSubmit()` / `clickOptimize()`

### OptimizeModal (`tests/pages/OptimizeModal.ts`)
- `modal` — `[role="dialog"]`
- `tabTopUp` / `tabMatchItems` / `tabFillCatalog` — `[role="tab"]` buttons
- `applyButton` — `button` with text "Apply Suggestions"
- `cancelButton` — `button` with text "Cancel"
- `statusLine` — meta slot text in SectionBar
- `suggestionRows` — rows in the scrollable area
- `selectMode(mode)` — click the appropriate tab
- `waitForResult()` — wait for suggestion rows or empty state

### OrderConfirmationPage (`tests/pages/OrderConfirmationPage.ts`)
- `orderNumber` — element displaying "SVS-XXXXXX"
- `backButton` — element to go back to builder

### OrdersPage (`tests/pages/OrdersPage.ts`)
- `emptyState` — "No container orders yet"
- `orderRows` — all rows in the table
- `orderNumber(row)` / `status(row)` — per-row getters
- `buildContainerButton` — link to `/`

---

## Environment Requirements

- `NEXT_PUBLIC_SUPABASE_URL` — from `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY` — from `.env.local`
- `PLAYWRIGHT_BASE_URL` — defaults to `http://localhost:3000`
- Dev server running on port 3000 (already running; `reuseExistingServer: true`)
- `dotenv` loaded at top of `playwright.config.ts`

---

## Constraints and Rules

1. **No raw selectors in spec files.** All locators go through POM methods.
2. **No `waitForTimeout`.** Use `waitForURL`, `waitForSelector`, `expect().toBeVisible()`, `waitForLoadState('networkidle')` only when necessary.
3. **No hardcoded credentials in specs.** Auth handled exclusively via fixture; credentials are in env vars.
4. **DB cleanup.** Every test that submits an order registers the order ID for teardown in the `cleanupOrders` fixture.
5. **Atomic tests.** Each spec must be independently runnable. The auth fixture provides a fresh authenticated page per test.
6. **No `page.waitForTimeout` or `page.pause`.** If a test is flaky without sleep, it's a bug in the assertion strategy, not a timing issue.
