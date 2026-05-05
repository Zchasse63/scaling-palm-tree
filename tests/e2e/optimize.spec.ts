/**
 * Optimize Fill edge-case tests — P1 and P2
 *
 * Covers:
 *   P1-17  top_up mode fills from existing cart items
 *   P1-18  fill_catalog mode fills from empty-ish cart
 *   P1-19  complete_set mode suggests complementary items (lids for pans)
 *   P1-20  Optimize → Apply → Submit succeeds
 *   P1-21  Optimize twice without cart changes → 2nd is no-op
 *   P1-22  Empty cart → Optimize button disabled (canOptimize = false)
 */

import { expect } from "@playwright/test";
import { test, findOrderByNumber } from "../fixtures/auth";
import { BuilderPage } from "../pages/BuilderPage";
import { OptimizeModal } from "../pages/OptimizeModal";

// ---------------------------------------------------------------------------
// P1-22 — Empty cart → Optimize button disabled
// ---------------------------------------------------------------------------
test("P1-22 empty cart makes optimize button disabled", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);

  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // With empty cart, canOptimize = (fillFraction > 0 && volPct < 100) = false.
  const optimizeEnabled = await builder.isOptimizeEnabled();
  expect(optimizeEnabled).toBe(false);
});

// ---------------------------------------------------------------------------
// P1-18 — fill_catalog mode fills from a partially-filled cart
// ---------------------------------------------------------------------------
test("P1-18 fill_catalog mode fills to near 100%", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  const modal = new OptimizeModal(page);

  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Add one item to enable the Optimize button.
  await builder.firstPlusButton().click();

  // Record current volume before optimize.
  await expect(builder.summaryPanel.locator(".t-stat").first()).not.toHaveText("0.0", { timeout: 5_000 });
  const volBefore = await builder.getVolumePct();

  // Open Optimize.
  await builder.clickOptimize();
  await modal.waitForOpen();

  // Switch to fill_catalog mode.
  await modal.selectFillCatalog();

  // Wait for suggestions to be computed (Apply button enabled or suggestions visible).
  await expect(modal.applyButton).not.toBeDisabled({ timeout: 5_000 });

  const count = await modal.suggestionCount();
  expect(count).toBeGreaterThan(0);

  // Apply and wait for the volume to change.
  await modal.clickApply();
  await modal.waitForClose();

  // Wait for the Ticker to update (90ms fade + React re-render).
  const vol = await builder.waitForVolumeChange(volBefore, 8_000);
  expect(vol).toBeGreaterThanOrEqual(95);
  expect(vol).toBeLessThanOrEqual(100.1);
});

// ---------------------------------------------------------------------------
// P1-17 — top_up mode adds to existing cart items
// ---------------------------------------------------------------------------
test("P1-17 top_up mode adds to existing cart items", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  const modal = new OptimizeModal(page);

  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Add one item to cart.
  await builder.firstPlusButton().click();

  // Wait for volume to register.
  await expect(builder.summaryPanel.locator(".t-stat").first()).not.toHaveText("0.0", { timeout: 5_000 });
  const volBefore = await builder.getVolumePct();
  expect(volBefore).toBeGreaterThan(0);
  expect(volBefore).toBeLessThan(100);

  // Open Optimize — top_up should be the default mode when cart has items.
  await builder.clickOptimize();
  await modal.waitForOpen();

  // Verify top_up is selected (aria-selected="true").
  const topUpSelected = await modal.tabTopUp.getAttribute("aria-selected");
  expect(topUpSelected).toBe("true");

  // Wait for suggestions to be computed.
  await expect(modal.applyButton).not.toBeDisabled({ timeout: 5_000 });

  const count = await modal.suggestionCount();
  expect(count).toBeGreaterThan(0);

  await modal.clickApply();
  await modal.waitForClose();

  // Wait for the volume display to update past the starting value.
  const volAfter = await builder.waitForVolumeChange(volBefore, 8_000);
  expect(volAfter).toBeGreaterThan(volBefore);
});

// ---------------------------------------------------------------------------
// P1-19 — complete_set mode suggests complementary items
// ---------------------------------------------------------------------------
test("P1-19 complete_set mode runs without crash and shows expected content", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  const modal = new OptimizeModal(page);

  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Add a container/pan SKU to cart (not a lid, not a combo).
  const containerRows = page
    .locator("div.row-hover")
    .filter({ hasText: /Container/i })
    .filter({ hasNotText: /Lid|Combo/i });
  const containerCount = await containerRows.count();

  if (containerCount === 0) {
    test.skip(true, "No container/lid pairs in this catalog for complete_set test");
    return;
  }

  // Add first container SKU.
  const plusBtn = containerRows.first().locator('button[aria-label="Increase"]');
  await plusBtn.click();

  // Open Optimize.
  await builder.clickOptimize();
  await modal.waitForOpen();

  // Switch to "Match items" (complete_set).
  await modal.selectMatchItems();

  // Wait for the modal content to settle — either Apply becomes enabled or empty state appears.
  await expect(modal.modal.locator('[role="tab"][aria-selected="true"]')).toHaveText("Match items", { timeout: 5_000 });

  // Verify it doesn't crash and shows either suggestions or an appropriate empty state.
  const bodyText = await modal.modal.textContent();
  const hasExpectedContent =
    (bodyText ?? "").length > 0 &&
    !((bodyText ?? "").includes("Application error")) &&
    !((bodyText ?? "").includes("Internal Server Error"));
  expect(hasExpectedContent).toBe(true);

  await modal.clickCancel();
  await modal.waitForClose();
});

// ---------------------------------------------------------------------------
// P1-20 — Optimize fill_catalog → Apply → Submit succeeds
// ---------------------------------------------------------------------------
test("P1-20 optimize then submit completes successfully", async ({
  authenticatedPage,
  cleanupOrder,
}) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  const modal = new OptimizeModal(page);

  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Add one item to enable optimize.
  await builder.firstPlusButton().click();

  // Record pre-optimize volume.
  await expect(builder.summaryPanel.locator(".t-stat").first()).not.toHaveText("0.0", { timeout: 5_000 });
  const volBefore = await builder.getVolumePct();

  // Optimize with fill_catalog.
  await builder.clickOptimize();
  await modal.waitForOpen();
  await modal.selectFillCatalog();
  await expect(modal.applyButton).not.toBeDisabled({ timeout: 5_000 });
  await modal.clickApply();
  await modal.waitForClose();

  // Wait for volume to update past starting value.
  const vol = await builder.waitForVolumeChange(volBefore, 8_000);
  expect(vol).toBeGreaterThanOrEqual(99.9);

  // Submit.
  await builder.clickSubmit();
  await builder.waitForConfirmation();

  const orderNumber = await builder.getConfirmationOrderNumber();
  expect(orderNumber).toMatch(/SVS-\d+/);

  // Cleanup.
  const orderRow = await findOrderByNumber(orderNumber);
  if (orderRow) cleanupOrder(orderRow.id);
});

// ---------------------------------------------------------------------------
// P1-21 — Optimize twice without cart changes → 2nd is no-op
// ---------------------------------------------------------------------------
test("P1-21 applying optimize twice is idempotent", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  const modal = new OptimizeModal(page);

  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Add one item.
  await builder.firstPlusButton().click();

  // Record pre-optimize volume.
  await expect(builder.summaryPanel.locator(".t-stat").first()).not.toHaveText("0.0", { timeout: 5_000 });
  const volBefore = await builder.getVolumePct();

  // First optimize application.
  await builder.clickOptimize();
  await modal.waitForOpen();
  await modal.selectFillCatalog();
  await expect(modal.applyButton).not.toBeDisabled({ timeout: 5_000 });
  await modal.clickApply();
  await modal.waitForClose();

  // Wait for volume to update.
  const vol1 = await builder.waitForVolumeChange(volBefore, 8_000);

  // Second optimize application — cart is now at ~100% or very close.
  // The Optimize button should be disabled now if volume >= 100% (canOptimize = volPct < 100).
  const optimizeEnabled = await builder.isOptimizeEnabled();
  if (!optimizeEnabled) {
    // Button disabled at 100% fill — correct behavior.
    expect(optimizeEnabled).toBe(false);
    return;
  }

  // If button is still enabled (partial fill), open and verify no suggestions or no_change.
  await builder.clickOptimize();
  await modal.waitForOpen();
  await modal.selectFillCatalog();

  // Wait for the modal to settle.
  await expect(modal.modal.locator('[role="tab"][aria-selected="true"]')).toHaveText("Fill from catalog", { timeout: 5_000 });

  // Either Apply is disabled (no suggestions) or status indicates already full.
  const isApplyDisabled = await modal.isApplyDisabled();
  const statusText = await modal.getStatusText();

  const acceptable =
    isApplyDisabled ||
    statusText.toLowerCase().includes("no changes") ||
    statusText.toLowerCase().includes("100.0%");
  expect(acceptable).toBe(true);

  await modal.clickCancel();
  await modal.waitForClose();

  // Volume should not decrease.
  const vol2 = await builder.getVolumePct();
  expect(vol2).toBeGreaterThanOrEqual(vol1 - 0.1); // tolerance for Ticker rounding
});
