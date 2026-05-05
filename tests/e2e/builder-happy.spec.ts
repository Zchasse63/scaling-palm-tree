/**
 * Builder happy-path tests — P0 and P1/P2
 *
 * Covers:
 *   P0-04  Add SKUs → totals update (volume + weight bars tick)
 *   P0-05  Fill to 100% via Optimize → submit → confirmation + DB write
 *   P0-06  Navigate to /orders → just-submitted order appears
 *   P2-05  Confirmation "Build Another Container" resets cart
 *   P2-08  Empty cart → "Add cases to start building" caption
 *   P2-09  volPct > 100 → burgundy "Over capacity" message
 */

import { expect } from "@playwright/test";
import { test, findOrderByNumber } from "../fixtures/auth";
import { BuilderPage } from "../pages/BuilderPage";
import { OptimizeModal } from "../pages/OptimizeModal";
import { OrdersPage } from "../pages/OrdersPage";

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
// P0-04 — Add SKUs → totals update
// ---------------------------------------------------------------------------
test("P0-04 adding SKUs updates volume and weight", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);

  // The catalog must be loaded first.
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Initial state: volume should be 0.0%.
  const initialVol = await builder.getVolumePct();
  expect(initialVol).toBe(0);

  // Add qty via a foil-roll SKU (packMultiple=200, cases_per_40hc=4000):
  // clicking + gives 200 cases = 5.0% fill. This gives a measurable jump.
  const foilInput = builder.qtyInput("Aluminum Foil").first();
  await foilInput.waitFor({ timeout: 10_000 });

  // Click the plus button in the foil row (0 → 200 cases).
  await builder.plusButton("Aluminum Foil").first().click();

  // Wait for the stat to change from "0.0" (Ticker has 90ms fade).
  await expect(builder.summaryPanel.locator(".t-stat").first()).not.toHaveText("0.0", { timeout: 5_000 });
  const vol1 = await builder.getVolumePct();
  expect(vol1).toBeGreaterThan(0);

  // Click again — 200 → 400 cases = 10.0%, clearly different from 5.0%.
  await builder.plusButton("Aluminum Foil").first().click();

  // Wait for the stat to change from vol1 (which is 5.0% → ticker shows "5.0").
  const vol2 = await builder.waitForVolumeChange(vol1, 5_000);
  expect(vol2).toBeGreaterThan(vol1);
});

// ---------------------------------------------------------------------------
// P2-08 — Empty cart shows "Add cases to start building" caption
// ---------------------------------------------------------------------------
test("P2-08 empty cart shows add-cases caption", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  const caption = await builder.getVolumeCaption();
  expect(caption.toLowerCase()).toContain("add cases");
});

// ---------------------------------------------------------------------------
// P2-09 — Volume over 100% shows "Over capacity" message
// ---------------------------------------------------------------------------
test("P2-09 over-capacity shows burgundy over-capacity message", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Type a huge value in the first input to force over-capacity.
  const firstInput = builder.firstQtyInput();
  await typeAndBlur(firstInput, "99999");

  // Wait for the over-capacity message to appear in the summary panel.
  // Use .first() to avoid strict mode violation when both the percentage line and
  // the disabled-reason text both contain "over capacity".
  await expect(
    builder.summaryPanel.locator("div.mono").filter({ hasText: /over capacity by/i }).first()
  ).toBeVisible({ timeout: 5_000 });

  const caption = await builder.getVolumeCaption();
  expect(caption.toLowerCase()).toContain("over capacity");

  // Submit must be disabled when over capacity.
  const submitEnabled = await builder.isSubmitEnabled();
  expect(submitEnabled).toBe(false);
});

// ---------------------------------------------------------------------------
// P0-05 + P0-06 — Full container submit → DB write → /orders shows order
// ---------------------------------------------------------------------------
test("P0-05 + P0-06 fill to 100%, submit, confirm DB write, see on orders page", async ({
  authenticatedPage,
  cleanupOrder,
}) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  const modal = new OptimizeModal(page);
  const orders = new OrdersPage(page);

  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Add one item first so optimize button is enabled.
  await builder.firstPlusButton().click();

  // Record pre-optimize volume.
  await expect(builder.summaryPanel.locator(".t-stat").first()).not.toHaveText("0.0", { timeout: 5_000 });
  const volBefore = await builder.getVolumePct();

  // Use "Fill from catalog" optimize mode to reach 100%.
  await builder.clickOptimize();
  await modal.waitForOpen();
  await modal.selectFillCatalog();

  // Wait for Apply button to become enabled (suggestions computed by useMemo).
  await expect(modal.applyButton).not.toBeDisabled({ timeout: 5_000 });

  const count = await modal.suggestionCount();
  expect(count).toBeGreaterThan(0);

  await modal.clickApply();
  await modal.waitForClose();

  // Wait for the Ticker to update — volume should jump to ~100%.
  const vol = await builder.waitForVolumeChange(volBefore, 8_000);
  expect(vol).toBeGreaterThanOrEqual(99.9);
  expect(vol).toBeLessThanOrEqual(100.1);

  // Submit should be enabled.
  const submitEnabled = await builder.isSubmitEnabled();
  expect(submitEnabled).toBe(true);

  // Click submit and wait for confirmation.
  await builder.clickSubmit();
  await builder.waitForConfirmation();

  // Get the order number from the confirmation view.
  const orderNumber = await builder.getConfirmationOrderNumber();
  expect(orderNumber).toMatch(/SVS-\d+/);

  // Register for cleanup.
  const orderRow = await findOrderByNumber(orderNumber);
  expect(orderRow).not.toBeNull();
  if (orderRow) cleanupOrder(orderRow.id);

  // Navigate to orders page and verify the order appears.
  await builder.clickViewPastOrders();
  await orders.pageTitle.waitFor({ timeout: 10_000 });

  const rowIndex = await orders.findRowByOrderNumber(orderNumber);
  expect(rowIndex).toBeGreaterThanOrEqual(0);

  // Initial status after customer submission is "submitted" (not yet quoted by Servous).
  const status = await orders.getStatus(rowIndex);
  expect(status.toLowerCase()).toContain("submitted");
});

// ---------------------------------------------------------------------------
// P2-05 — "Build Another Container" resets cart
// ---------------------------------------------------------------------------
test("P2-05 build-another resets the cart to empty", async ({
  authenticatedPage,
  cleanupOrder,
}) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  const modal = new OptimizeModal(page);

  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Add one item then fill via optimize.
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

  // Wait for volume to update.
  await builder.waitForVolumeChange(volBefore, 8_000);

  await builder.clickSubmit();
  await builder.waitForConfirmation();

  // Register cleanup.
  const orderNumber = await builder.getConfirmationOrderNumber();
  const orderRow = await findOrderByNumber(orderNumber);
  if (orderRow) cleanupOrder(orderRow.id);

  // Click "Build Another Container".
  await builder.clickBuildAnother();

  // Cart should be reset — volume back to 0. Wait for the stat to show 0.0.
  await expect(builder.summaryPanel.locator("div.mono").filter({ hasText: /add cases/i })).toBeVisible({ timeout: 5_000 });

  const vol = await builder.getVolumePct();
  expect(vol).toBe(0);

  // Submit should be disabled (empty cart).
  const submitEnabled = await builder.isSubmitEnabled();
  expect(submitEnabled).toBe(false);
});
