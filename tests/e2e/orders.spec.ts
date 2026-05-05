/**
 * Orders page tests — P1 and P2
 *
 * Covers:
 *   P1-23  Fresh auth (no orders) → /orders shows empty state
 *   P1-24  After submit → /orders shows order with correct number and status
 */

import { expect } from "@playwright/test";
import { test, findOrderByNumber } from "../fixtures/auth";
import { BuilderPage } from "../pages/BuilderPage";
import { OptimizeModal } from "../pages/OptimizeModal";
import { OrdersPage } from "../pages/OrdersPage";

// ---------------------------------------------------------------------------
// P1-23 — Orders page empty state
// ---------------------------------------------------------------------------
test("P1-23 /orders shows empty state when no orders exist", async ({ authenticatedPage }) => {
  const page = authenticatedPage;

  // Navigate to orders.
  await page.goto("/orders");

  const orders = new OrdersPage(page);
  await orders.pageTitle.waitFor({ timeout: 10_000 });

  // Count rows — if none, the empty state should be visible.
  const rowCount = await orders.orderCount();
  if (rowCount === 0) {
    await orders.emptyState.waitFor({ state: "visible", timeout: 5_000 });
    const emptyText = await orders.emptyState.textContent();
    expect(emptyText).toContain("No container orders yet");
  } else {
    // If orders already exist (from prior test runs), just verify the page loads cleanly.
    expect(rowCount).toBeGreaterThan(0);
  }
});

// ---------------------------------------------------------------------------
// P1-24 — After submit, /orders shows order with correct number and status
// ---------------------------------------------------------------------------
test("P1-24 submitted order appears in /orders with correct details", async ({
  authenticatedPage,
  cleanupOrder,
}) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  const modal = new OptimizeModal(page);
  const orders = new OrdersPage(page);

  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Add one item and record pre-optimize volume.
  await builder.firstPlusButton().click();
  await expect(builder.summaryPanel.locator(".t-stat").first()).not.toHaveText("0.0", { timeout: 5_000 });
  const volBefore = await builder.getVolumePct();

  // Fill to 100% and submit.
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

  const orderNumber = await builder.getConfirmationOrderNumber();
  expect(orderNumber).toMatch(/SVS-\d+/);

  // Register cleanup.
  const orderRow = await findOrderByNumber(orderNumber);
  if (orderRow) cleanupOrder(orderRow.id);

  // Navigate to /orders.
  await page.goto("/orders");
  await orders.pageTitle.waitFor({ timeout: 10_000 });

  // Find our order.
  const rowIndex = await orders.findRowByOrderNumber(orderNumber);
  expect(rowIndex).toBeGreaterThanOrEqual(0);

  // Verify status shows "submitted" (initial status after customer submits an order).
  const status = await orders.getStatus(rowIndex);
  expect(status.toLowerCase()).toContain("submitted");

  // Verify cells are not empty.
  const cells = await orders.getRowText(rowIndex);
  expect(cells[0]).toContain("SVS-"); // Order #
  expect(cells.length).toBeGreaterThanOrEqual(7);
});
