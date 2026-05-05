# Sentinel Audit Report — Servous Container Builder

**Feature:** container-builder
**Sentinel:** qa-sentinel
**Date:** 2026-05-04
**Cycle:** 1 of 3
**Verdict:** BLOCKED — 3 critical issues

---

## Summary

The test suite passes basic structural checks (POM pattern used, no hardcoded credentials in test env vars, no `waitForTimeout` in most places). However, 3 critical issues were identified that must be fixed before the Healer runs, plus 4 warnings.

---

## Critical Issues (BLOCK)

### CRITICAL-1: `page.waitForTimeout(500)` used in 4 spec files

**Files affected:**
- `tests/e2e/builder-happy.spec.ts` — lines 104, 162 (`await page.waitForTimeout(500)`)
- `tests/e2e/optimize.spec.ts` — lines 47, 60, 73, 95, 118 (`await page.waitForTimeout(500)`)
- `tests/e2e/submit-gate.spec.ts` — line 293 (`await page.waitForTimeout(500)`)

**Rule violated:** No `waitForTimeout`. The architect plan explicitly states "No `waitForTimeout`."

**Fix required:** Replace all `waitForTimeout(500)` calls with deterministic waits. In the OptimizeModal context, the correct approach is to wait for the suggestion rows to appear or the Apply button to become enabled:
```typescript
// Instead of: await page.waitForTimeout(500);
// Use: await modal.applyButton.waitFor({ state: 'visible' });
// Or: wait for suggestion count to stabilize
await expect(modal.applyButton).not.toBeDisabled({ timeout: 5_000 });
```

For the builder optimization flow, after `clickApply()`, wait for the volume display to change from its previous value rather than sleeping.

---

### CRITICAL-2: Raw selectors in spec files bypassing POM

**Files affected:**
- `tests/e2e/builder-happy.spec.ts` lines 34, 69, 70, 101 — `page.locator('button[aria-label="Increase"]').first()`, `page.locator('input[type="number"]').first()`
- `tests/e2e/submit-gate.spec.ts` lines 73, 74, 153, 154, 155, 285 — same patterns
- `tests/e2e/optimize.spec.ts` lines 37, 61 — `page.locator('button[aria-label="Increase"]').first()`
- `tests/e2e/stepper.spec.ts` lines 40, 55, 70 — `page.locator('input[type="number"]').first()` via POM builder but still `page.locator(...)` called directly in spec for the first plus/minus

**Rule violated:** "No raw selectors in spec files. All locators go through POM methods."

**Fix required:** Move all raw selectors into BuilderPage POM methods. Add these methods to `BuilderPage.ts`:
```typescript
/** The first plus button in the catalog (any SKU). */
firstPlusButton(): Locator {
  return this.page.locator('button[aria-label="Increase"]').first();
}

/** The first qty input in the catalog (any SKU). */
firstQtyInput(): Locator {
  return this.page.locator('input[type="number"]').first();
}

/** The first minus button in the catalog (any SKU). */
firstMinusButton(): Locator {
  return this.page.locator('button[aria-label="Decrease"]').first();
}
```
Then update all spec files to use `builder.firstPlusButton()` etc.

---

### CRITICAL-3: P1-04 test has no meaningful assertion — placeholder `expect(true).toBe(true)`

**File:** `tests/e2e/submit-gate.spec.ts` line 268

**Rule violated:** Tests must have meaningful assertions. A test body of `expect(true).toBe(true)` is not a test — it always passes and provides no coverage.

**Fix required:** Either:
1. Implement the test by using `page.evaluate` to call the server action via the Next.js Server Action HTTP protocol (POST to the page with `Next-Action` header and the action ID), capturing the `{ ok: false }` response.
2. OR mark it as `test.skip()` with a descriptive reason so it's clearly a known gap, not a false pass.

Option 2 is acceptable for now since the Stepper design structurally prevents below-min UI state:
```typescript
test.skip("P1-04 server-side rejects below-min line submission", () => {
  // The Stepper snap logic prevents below-min qty for this catalog.
  // Server enforcement exists in submitOrderAction (belowMinLines check) but
  // cannot be triggered via browser UI. Requires direct HTTP API test.
});
```

---

## Warnings (non-blocking)

### WARNING-1: `page.waitForFunction(() => true)` used as flush — fragile

**Files:** `builder-happy.spec.ts`, `stepper.spec.ts`, `submit-gate.spec.ts`

`page.waitForFunction(() => true)` resolves immediately and is not a reliable "flush React state" mechanism. It provides no actual synchronization guarantee. Replace with concrete assertions:
- After stepper blur, wait for the input value to match the expected snapped value.
- After optimize apply, wait for volume display to update.

### WARNING-2: `findOrderByNumber` import in `auth.spec.ts` — unused

`auth.spec.ts` imports `findOrderByNumber` from `../fixtures/auth` but never uses it. Remove the import.

### WARNING-3: P1-01 test comment-explains why it's incomplete — should be assertive

**File:** `submit-gate.spec.ts` P1-01 test.

The test adds a large block of comments explaining why it can't fully test the server action, then falls back to the same UI-gate check as P0-08. This is redundant coverage, not a distinct P1 test. The test should either implement the server action call via HTTP or be merged with P0-08 and marked clearly.

### WARNING-4: `OptimizeModal.suggestionCount()` locator is fragile

The implementation uses `modal.locator("div.mono", { hasText: "→" })` to count suggestion rows. The "→" arrow appears in the header column label too ("→" is the arrow between "Current" and "Suggested"). Verify this count is accurate or use a more specific selector (e.g., the grid rows in the scrollable section that have 5 columns, not the header).

---

## Anti-Pattern Check

| Check | Status |
|---|---|
| No `waitForTimeout` | FAIL — 4+ instances |
| No raw selectors in specs | FAIL — 10+ instances |
| No hardcoded credentials | PASS — all via env vars |
| POM used for all page interactions | PARTIAL — POM exists but bypassed |
| DB cleanup on every DB-mutating test | PASS |
| No `page.pause()` | PASS |
| Meaningful assertions on all tests | FAIL — P1-04 placeholder |
| `page.waitForFunction(() => true)` fragile | WARNING |

---

## Plan Compliance

| Plan Requirement | Implemented | Notes |
|---|---|---|
| 12 P0 tests | 12 tests exist | P0-10 behavior changed (tests empty cart, not actual below-min) |
| 25 P1 tests | 24 tests + 1 placeholder | P1-04 is placeholder |
| 9 P2 tests | 9 tests exist | |
| Auth fixture (no email round-trip) | PASS | |
| DB cleanup on order-creating tests | PASS | |
| POM layer in tests/pages/ | PASS (created but partially bypassed) | |

---

## Fix Instructions for Engineer

1. **Fix CRITICAL-1:** Replace every `await page.waitForTimeout(N)` with a concrete locator wait:
   - In optimize modal context: `await expect(modal.applyButton).not.toBeDisabled({ timeout: 5_000 });`
   - After applying optimize: wait for volume stat to be above a threshold or for the modal to have closed.

2. **Fix CRITICAL-2:** Add `firstPlusButton()`, `firstQtyInput()`, `firstMinusButton()` to `BuilderPage.ts`. Update all spec files that call `page.locator('button[aria-label="Increase"]').first()` to use `builder.firstPlusButton()` instead.

3. **Fix CRITICAL-3:** Replace the `expect(true).toBe(true)` placeholder in P1-04 with `test.skip(...)` with a clear reason.

4. **Fix WARNING-2:** Remove the unused `findOrderByNumber` import from `auth.spec.ts`.

5. **Fix WARNING-1 (optional but recommended):** Replace `page.waitForFunction(() => true)` with concrete assertions like `await expect(firstInput).toHaveValue('0')`.

Run `npx tsc --noEmit` after fixes to confirm type safety.
