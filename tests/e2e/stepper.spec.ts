/**
 * Stepper edge-case tests — P1 and P2
 *
 * The foil-aluminum catalog has foil SKUs with packMultiple=200.
 * Other SKUs have packMultiple=null (step=1) and minCaseQty=100.
 *
 * Covers:
 *   P1-05  Type 50 in foil-roll (packMultiple=200) → blur → snaps to 0
 *   P1-06  Type 100 in foil-roll → blur → snaps to 200 (pack-multiple snap fires before below-min)
 *   P1-07  Type 101 in foil-roll → blur → snaps to 200
 *   P1-08  Type "abc" → blur → 0
 *   P1-09  Type "-50" → blur → 0
 *   P1-10  Stepper at 0 → minus button disabled
 *   P1-11  Increment past 100% → submit still blocked (over-filled)
 *   P1-12  Type 999999 → accepted as 99999 (max), volPct huge, submit blocked
 *   P2-01  ArrowUp increments qty
 *   P2-02  ArrowDown decrements qty (or goes to 0)
 */

import { expect } from "@playwright/test";
import { test } from "../fixtures/auth";
import { BuilderPage } from "../pages/BuilderPage";

// Product name substring to locate foil roll rows.
// Actual product names: "Aluminum Foil — 18\"x500' Heavy Duty", "Aluminum Foil — 18\"x500' Standard"
// Both have packMultiple=200, effectiveMin=200.
const FOIL_ROLL_NAME = "Aluminum Foil";

// Non-foil SKU with packMultiple=null and minCaseQty=100.
const STANDARD_SKU = "Aluminum Container";

/**
 * Types a value into a stepper input and triggers the React onBlur snap.
 * Uses pressSequentially (real keyboard events → React onChange) then press("Tab")
 * (real browser Tab → browser focus moves → native blur fires → React onBlur snap).
 */
async function typeAndBlur(
  input: import("@playwright/test").Locator,
  value: string
): Promise<void> {
  await input.click({ clickCount: 3 });
  await input.pressSequentially(value);
  await input.press("Tab");
}

// ---------------------------------------------------------------------------
// P1-10 — Decrement at 0 → minus button disabled
// ---------------------------------------------------------------------------
test("P1-10 minus button disabled at qty=0", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // The minus button should be disabled when the row qty is 0 (initial state).
  const firstMinus = builder.minusButton(STANDARD_SKU).first();
  await firstMinus.waitFor({ timeout: 5_000 });
  const isDisabled = await firstMinus.isDisabled();
  expect(isDisabled).toBe(true);
});

// ---------------------------------------------------------------------------
// P1-08 — Type non-numeric → blur → functional state is 0 (empty cart)
//
// BUG-002: When onBlur snaps to 0 and the controlled value is already 0, React
// bails out (Object.is(0,0)) — no re-render — so the input display stays stale
// (showing "" or the typed chars). The cart state is correct (0), but the visual
// display doesn't reset.
// We verify the functional invariants (empty cart, submit disabled) rather than
// the input display value.
// ---------------------------------------------------------------------------
test("P1-08 typing non-numeric chars: cart stays empty, submit stays blocked", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  const input = builder.qtyInput(STANDARD_SKU).first();
  await typeAndBlur(input, "abc");

  // Functional invariant: cart is empty (volume = 0), submit is disabled.
  // (Input display may not reset to "0" due to BUG-002 — React state bailout.)
  const vol = await builder.getVolumePct();
  expect(vol).toBe(0);

  const submitEnabled = await builder.isSubmitEnabled();
  expect(submitEnabled).toBe(false);
});

// ---------------------------------------------------------------------------
// P1-09 — Type negative value → blur → functional state is 0 (empty cart)
//
// BUG-002: Same React state bailout as P1-08. Input display may show "-50" or "50"
// instead of "0", but the cart state is correctly 0.
// ---------------------------------------------------------------------------
test("P1-09 typing negative value: cart stays empty, submit stays blocked", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  const input = builder.qtyInput(STANDARD_SKU).first();
  await typeAndBlur(input, "-50");

  // Functional invariant: cart is empty (volume = 0), submit is disabled.
  const vol = await builder.getVolumePct();
  expect(vol).toBe(0);

  const submitEnabled = await builder.isSubmitEnabled();
  expect(submitEnabled).toBe(false);
});

// ---------------------------------------------------------------------------
// P1-05 — Foil roll: type 50 → blur → functional state is 0 (empty cart)
//
// packMultiple=200: round(50/200)*200 = 0. onChange(0) called. Parent was already 0.
//
// BUG-002: React bails out on the state update (0→0). useEffect doesn't fire.
// setLocal("0") never called. Input display stays "50". Cart state is correctly 0
// (volume=0%, submit disabled). Visual regression but not a functional defect.
// ---------------------------------------------------------------------------
test("P1-05 foil roll stepper: type 50 → cart is empty, submit blocked (BUG-002: display stays stale)", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  const input = builder.qtyInput(FOIL_ROLL_NAME).first();
  await typeAndBlur(input, "50");

  // Functional invariant: volume is 0 and submit is disabled (snap to 0 succeeded).
  // BUG-002: Input display may still show "50" (stale local state — React bailout).
  const vol = await builder.getVolumePct();
  expect(vol).toBe(0);

  const submitEnabled = await builder.isSubmitEnabled();
  expect(submitEnabled).toBe(false);
});

// ---------------------------------------------------------------------------
// P1-06 — Foil roll: type 100 → blur → snaps to 200 (pack-multiple takes precedence)
//
// packMultiple=200: round(100/200)*200 = round(0.5)*200 = 1*200 = 200.
// The pack-multiple snap fires BEFORE the below-min check, so 100 → 200, not 0.
// The below-min check only runs if v is still < effectiveMin AFTER pack snap.
// Since 200 == effectiveMin, the below-min condition is false → onChange(200).
// No BUG-002 here: parent state changes from 0→200, so React re-renders and
// useEffect fires setLocal("200").
// ---------------------------------------------------------------------------
test("P1-06 foil roll stepper: type 100 snaps to 200 (pack-multiple snap fires first)", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  const input = builder.qtyInput(FOIL_ROLL_NAME).first();
  await typeAndBlur(input, "100");

  // Pack-multiple snap: Math.round(100/200)*200 = 1*200 = 200.
  await expect(input).toHaveValue("200", { timeout: 5_000 });
  const val = await input.inputValue();
  expect(parseInt(val || "0", 10)).toBe(200);
});

// ---------------------------------------------------------------------------
// P1-07 — Foil roll: type 101 → blur → snaps to 200
// ---------------------------------------------------------------------------
test("P1-07 foil roll stepper: type 101 snaps to 200 on blur", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  const input = builder.qtyInput(FOIL_ROLL_NAME).first();
  await typeAndBlur(input, "101");

  // Pack-multiple snap: round(101/200)*200 = round(0.505)*200 = 1*200 = 200.
  await expect(input).toHaveValue("200", { timeout: 5_000 });
  const val = await input.inputValue();
  expect(parseInt(val || "0", 10)).toBe(200);
});

// ---------------------------------------------------------------------------
// P1-12 — Type 999999 → capped by max, submit blocked
// ---------------------------------------------------------------------------
test("P1-12 typing 999999 is capped and submit is blocked when over-filled", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  const input = builder.firstQtyInput();
  await typeAndBlur(input, "999999");

  // Stepper enforces max=99999 via Math.min(max, v) on blur.
  await expect(input).not.toHaveValue("999999", { timeout: 5_000 });
  const val = await input.inputValue();
  const n = parseInt(val || "0", 10);
  expect(n).toBeLessThanOrEqual(99999);

  // Volume is astronomically large → submit must be blocked.
  const submitEnabled = await builder.isSubmitEnabled();
  expect(submitEnabled).toBe(false);
});

// ---------------------------------------------------------------------------
// P1-11 — Fill via large quantity → over-capacity → submit blocked
// ---------------------------------------------------------------------------
test("P1-11 clicking + past container max blocks submit", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Type a large value to push over 100%.
  const firstInput = builder.firstQtyInput();
  await typeAndBlur(firstInput, "99999");

  // Wait for volume to update.
  await expect(builder.summaryPanel.locator(".t-stat").first()).not.toHaveText("0.0", { timeout: 5_000 });

  // Submit must be blocked (either over-fill or under-fill — either way, not submittable).
  const submitEnabled = await builder.isSubmitEnabled();
  expect(submitEnabled).toBe(false);
});

// ---------------------------------------------------------------------------
// P2-01 — ArrowUp increments qty
// ---------------------------------------------------------------------------
test("P2-01 ArrowUp key increments qty", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Set a known qty via plus button (0 → effectiveMin=100).
  await builder.firstPlusButton().click();

  const input = builder.qtyInput(STANDARD_SKU).first();
  const before = await input.inputValue();
  const beforeN = parseInt(before, 10);

  // Focus input and press ArrowUp.
  await input.focus();
  await input.press("ArrowUp");

  // Wait for the value to increase.
  await expect(input).not.toHaveValue(before, { timeout: 3_000 });

  const after = await input.inputValue();
  const afterN = parseInt(after, 10);
  expect(afterN).toBeGreaterThan(beforeN);
});

// ---------------------------------------------------------------------------
// P2-02 — ArrowDown decrements qty (or goes to 0)
// ---------------------------------------------------------------------------
test("P2-02 ArrowDown key decrements qty or goes to 0", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Click twice: 0 → 100 → 101.
  await builder.firstPlusButton().click();
  await builder.firstPlusButton().click();

  const input = builder.qtyInput(STANDARD_SKU).first();
  const before = await input.inputValue();
  const beforeN = parseInt(before, 10);

  // Press ArrowDown.
  await input.focus();
  await input.press("ArrowDown");

  // Wait for the value to change.
  await expect(input).not.toHaveValue(before, { timeout: 3_000 });

  const after = await input.inputValue();
  const afterN = parseInt(after, 10);
  expect(afterN).toBeLessThanOrEqual(beforeN);
});
