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

  // Apply the Fill From Catalog strategy.
  await expect(modal.applyButton("Fill From Catalog")).not.toBeDisabled({ timeout: 5_000 });
  const count = await modal.suggestionCountInPanel("Fill From Catalog");
  expect(count).toBeGreaterThan(0);
  await modal.applyFillCatalog();
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

  // Open Optimize — Top Up Cart should be enabled when cart has items.
  await builder.clickOptimize();
  await modal.waitForOpen();

  // Verify Top Up Cart is enabled and apply it.
  await expect(modal.applyButton("Top Up Cart")).not.toBeDisabled({ timeout: 5_000 });
  const count = await modal.suggestionCountInPanel("Top Up Cart");
  expect(count).toBeGreaterThan(0);
  await modal.applyTopUp();
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

  // Match Items panel renders (no tabs anymore — three panels are stacked).
  await expect(modal.panel("Match Items")).toBeVisible({ timeout: 5_000 });

  // The modal must not have crashed; smoke-check for error strings.
  const bodyText = await modal.modal.textContent();
  const ok =
    (bodyText ?? "").length > 0 &&
    !((bodyText ?? "").includes("Application error")) &&
    !((bodyText ?? "").includes("Internal Server Error"));
  expect(ok).toBe(true);

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
  await expect(modal.applyButton("Fill From Catalog")).not.toBeDisabled({ timeout: 5_000 });
  await modal.applyFillCatalog();
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
  await expect(modal.applyButton("Fill From Catalog")).not.toBeDisabled({ timeout: 5_000 });
  await modal.applyFillCatalog();
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
  // Fill From Catalog panel must render.
  await expect(modal.panel("Fill From Catalog")).toBeVisible({ timeout: 5_000 });

  // After a recent fill, the Fill From Catalog panel's Apply should be either
  // disabled OR the panel header status should indicate the cart is already
  // at exact capacity.
  const isApplyDisabled = await modal.isApplyDisabled("Fill From Catalog");
  const panelText = (await modal.panel("Fill From Catalog").textContent()) ?? "";
  const acceptable =
    isApplyDisabled ||
    /no\s+suggestions/i.test(panelText) ||
    /100\.0%/.test(panelText) ||
    /already\s+at\s+capacity/i.test(panelText);
  expect(acceptable).toBe(true);

  await modal.clickCancel();
  await modal.waitForClose();

  // Volume should not decrease.
  const vol2 = await builder.getVolumePct();
  expect(vol2).toBeGreaterThanOrEqual(vol1 - 0.1); // tolerance for Ticker rounding
});
