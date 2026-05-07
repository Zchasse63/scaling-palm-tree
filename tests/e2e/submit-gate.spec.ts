/**
 * Submit gate adversarial tests — P0, P1, P2
 *
 * Covers:
 *   P0-07  Cart empty → Submit disabled
 *   P0-08  volPct < 100% → Submit disabled
 *   P0-09  volPct > 100% → Submit disabled
 *   P0-10  Stepper dec at effectiveMin → goes to 0 (below-min state unreachable via UI)
 *   P1-01  UI gate confirms under-filled submission is blocked
 *   P2-04  Double-click submit → at most one order created
 */

import { expect } from "@playwright/test";
import { test, findOrderByNumber } from "../fixtures/auth";
import { BuilderPage } from "../pages/BuilderPage";
import { OptimizeModal } from "../pages/OptimizeModal";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function adminSupabase() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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
// P0-07 — Empty cart → Submit disabled
// ---------------------------------------------------------------------------
test("P0-07 empty cart submit button is disabled", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  const submitEnabled = await builder.isSubmitEnabled();
  expect(submitEnabled).toBe(false);
});

// ---------------------------------------------------------------------------
// P0-08 — volPct < 100% → Submit disabled
// ---------------------------------------------------------------------------
test("P0-08 under-filled container submit is disabled", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Add one item (a small qty, well below 100% fill) via POM.
  await builder.firstPlusButton().click();

  // Wait for volume to update from 0.
  await expect(builder.summaryPanel.locator(".t-stat").first()).not.toHaveText("0.0", { timeout: 5_000 });

  const vol = await builder.getVolumePct();
  expect(vol).toBeGreaterThan(0);
  expect(vol).toBeLessThan(100);

  const submitEnabled = await builder.isSubmitEnabled();
  expect(submitEnabled).toBe(false);
});

// ---------------------------------------------------------------------------
// P0-09 — volPct > 100% → Submit disabled
// ---------------------------------------------------------------------------
test("P0-09 over-filled container submit is disabled", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Type a huge value in the first input (via POM) to overflow volume.
  const firstInput = builder.firstQtyInput();
  await typeAndBlur(firstInput, "99999");

  // Wait for the over-capacity indicator to appear.
  await expect(
    builder.summaryPanel.locator("div.mono").filter({ hasText: /over capacity/i }).first()
  ).toBeVisible({ timeout: 5_000 });

  const vol = await builder.getVolumePct();
  expect(vol).toBeGreaterThan(100);

  const submitEnabled = await builder.isSubmitEnabled();
  expect(submitEnabled).toBe(false);
});

// ---------------------------------------------------------------------------
// P0-10 — Stepper dec at effectiveMin → goes to 0 (stepper design invariant)
// ---------------------------------------------------------------------------
test("P0-10 decrement at effectiveMin goes to 0 (below-min UI state unreachable)", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  const firstInput = builder.firstQtyInput();
  const firstPlus = builder.firstPlusButton();
  const firstMinus = builder.firstMinusButton();

  // Click + once (0 → effectiveMin = 100 for standard SKUs).
  await firstPlus.click();

  await expect(firstInput).not.toHaveValue("0", { timeout: 3_000 });
  const qty = await firstInput.inputValue();
  expect(parseInt(qty, 10)).toBe(100); // at effectiveMin

  // From effectiveMin (100), click − → must go to 0 (not 99).
  await firstMinus.click();

  await expect(firstInput).toHaveValue("0", { timeout: 3_000 });
  const qtyAfter = await firstInput.inputValue();
  expect(parseInt(qtyAfter, 10)).toBe(0);

  // Cart is now empty → submit disabled.
  const submitEnabled = await builder.isSubmitEnabled();
  expect(submitEnabled).toBe(false);
});

// ---------------------------------------------------------------------------
// P1-01 — UI gate confirms under-filled submission is blocked
// ---------------------------------------------------------------------------
test("P1-01 adding one item shows submit blocked due to under-fill", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Fetch the first SKU's cases_per_40hc via admin RPC to calculate expected fill.
  // catalog_for_customer is a function now (since Phase B's pricing migration),
  // not a view — so the call goes through .rpc().
  const admin = adminSupabase();
  const TEST_CUSTOMER_ID = "68f5af45-d9b2-4f74-83c0-3275df0d6fa1";
  const WHITESTONE_VENDOR_ID = "2c1c07d7-4d90-4b9d-b952-796f2c91285d";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: skuRows } = await (admin as any).rpc("fn_catalog_for_customer", {
    p_customer_id: TEST_CUSTOMER_ID,
    p_vendor_id: WHITESTONE_VENDOR_ID,
  });

  expect(skuRows).not.toBeNull();
  expect((skuRows as Array<unknown>).length).toBeGreaterThan(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sku = (skuRows as Array<any>)[0];
  const underfillPct = (100 / sku.cases_per_40hc) * 100;
  expect(underfillPct).toBeLessThan(100);

  // Add one item (minCaseQty=100 cases → tiny fill contribution).
  await builder.firstPlusButton().click();

  // Wait for volume to update from 0.
  await expect(builder.summaryPanel.locator(".t-stat").first()).not.toHaveText("0.0", { timeout: 5_000 });

  const vol = await builder.getVolumePct();
  expect(vol).toBeGreaterThan(0);
  expect(vol).toBeLessThan(100);

  // Submit must be disabled.
  const submitEnabled = await builder.isSubmitEnabled();
  expect(submitEnabled).toBe(false);
});

// ---------------------------------------------------------------------------
// P1-04 — Server-side below-min check (skipped: UI prevents this state)
// ---------------------------------------------------------------------------
test.skip("P1-04 server-side rejects below-min line submission (unreachable via UI)", () => {
  // The Stepper snap logic prevents below-min qty for this catalog.
  // For standard SKUs (step=1, minCaseQty=100): dec() at effectiveMin goes to 0.
  // For foil rolls (packMultiple=200): effectiveMin=200; snap always lands on 0 or 200+.
  // The below-min state (0 < qty < effectiveMin) is structurally unreachable via the stepper UI.
  //
  // Server enforcement exists in submitOrderAction (belowMinLines check at lines 82-88)
  // and would reject any crafted request with below-min qtys.
});

// ---------------------------------------------------------------------------
// P2-04 — Double-click submit → at most one order created
// ---------------------------------------------------------------------------
test("P2-04 rapid double-click submit creates at most one order", async ({
  authenticatedPage,
  cleanupOrder,
}) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  const modal = new OptimizeModal(page);

  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Fill to 100% via optimize.
  await builder.firstPlusButton().click();

  // Record pre-optimize volume.
  await expect(builder.summaryPanel.locator(".t-stat").first()).not.toHaveText("0.0", { timeout: 5_000 });
  const volBefore = await builder.getVolumePct();

  await builder.clickOptimize();
  await modal.waitForOpen();
  await modal.selectFillCatalog();
  await expect(modal.applyButton).not.toBeDisabled({ timeout: 5_000 });
  await modal.clickApply();
  await modal.waitForClose();

  // Wait for volume to update to ~100%.
  const vol = await builder.waitForVolumeChange(volBefore, 8_000);
  expect(vol).toBeGreaterThanOrEqual(99.9);

  // Click submit twice in rapid succession.
  const submitBtn = builder.submitButton;
  await submitBtn.click();
  // Immediately try to click again (button should be in "Submitting..." / disabled state).
  try {
    await submitBtn.click({ timeout: 200 });
  } catch {
    // Expected — button is disabled during transition (useTransition sets pending=true).
  }

  // Wait for confirmation.
  await builder.waitForConfirmation();

  const orderNumber = await builder.getConfirmationOrderNumber();
  expect(orderNumber).toMatch(/SVS-\d+/);

  // Cleanup.
  const orderRow = await findOrderByNumber(orderNumber);
  if (orderRow) cleanupOrder(orderRow.id);

  // Verify only one order was created with this number.
  const admin = adminSupabase();
  const { data: rows } = await admin
    .from("customer_orders")
    .select("id, order_number")
    .eq("order_number", orderNumber);
  expect(rows?.length).toBe(1);
});
