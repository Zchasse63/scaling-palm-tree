/**
 * Admin dashboard tests — P3
 *
 * Covers:
 *   P3-01  admin /admin renders the overview dashboard
 *   P3-02  admin /admin/orders renders the queue with filter bar
 *   P3-03  /orders/[id] returns 404 for an unknown id (proxy for cross-tenant block)
 *   P3-04  customer can click an order row → land on /orders/[id] detail
 *   P3-05  admin can update an order status from /admin/orders/[id]
 *
 * The fixture customer (zchasse@atyourservous.com) is flagged is_admin=true,
 * so they have access to /admin. A non-admin negative test would require a
 * second fixture user; out of scope for V1.
 */

import { expect } from "@playwright/test";
import { test, findOrderByNumber } from "../fixtures/auth";
import { BuilderPage } from "../pages/BuilderPage";
import { OptimizeModal } from "../pages/OptimizeModal";

// ---------------------------------------------------------------------------
// P3-01 — admin home renders
// ---------------------------------------------------------------------------
test("P3-01 admin /admin renders the overview dashboard", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  await page.goto("/admin");
  // Heading present + at least the 4 stat cards.
  await expect(
    page.locator("div.t-h1", { hasText: "Container orders, all customers" }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("div.t-eyebrow", { hasText: "Awaiting confirmation" })).toBeVisible();
  await expect(page.locator("div.t-eyebrow", { hasText: "Revenue · last 30 days" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// P3-02 — admin queue + filter bar
// ---------------------------------------------------------------------------
test("P3-02 admin /admin/orders renders queue + filter bar", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  await page.goto("/admin/orders");
  await expect(
    page.locator("div.t-h1", { hasText: "All container orders" }),
  ).toBeVisible({ timeout: 10_000 });
  // Filter chips for at least these statuses
  await expect(page.locator("button", { hasText: "Submitted" }).first()).toBeVisible();
  await expect(page.locator("button", { hasText: "Cancelled" }).first()).toBeVisible();
  // Customer dropdown
  await expect(page.locator("select").first()).toBeVisible();
  // Download CSV button
  await expect(page.locator("button", { hasText: /Download CSV/i })).toBeVisible();
});

// ---------------------------------------------------------------------------
// P3-03 — /orders/[id] 404 for unknown id (proxy for cross-tenant block)
// ---------------------------------------------------------------------------
test("P3-03 customer /orders/[id] returns 404 for unknown order", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  // Random uuid that doesn't belong to any customer → fetchOrderDetail returns
  // null → notFound() throws → Next.js renders the 404 boundary.
  const r = await page.goto("/orders/00000000-0000-0000-0000-000000000000");
  expect(r?.status()).toBe(404);
});

// ---------------------------------------------------------------------------
// P3-04 — customer clicks order row → lands on detail page with order #
// ---------------------------------------------------------------------------
test("P3-04 customer order row → /orders/[id] shows full detail", async ({
  authenticatedPage,
  cleanupOrder,
}) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  const modal = new OptimizeModal(page);

  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Submit a fresh order so we have something concrete to click
  await builder.firstPlusButton().click();
  await expect(builder.summaryPanel.locator(".t-stat").first()).not.toHaveText("0.0", {
    timeout: 5_000,
  });
  const volBefore = await builder.getVolumePct();
  await builder.clickOptimize();
  await modal.waitForOpen();
  await expect(modal.applyButton("Fill From Catalog")).not.toBeDisabled({ timeout: 5_000 });
  await modal.applyFillCatalog();
  await modal.waitForClose();
  await builder.waitForVolumeChange(volBefore, 8_000);
  await builder.clickSubmit();
  await builder.waitForConfirmation();
  const orderNumber = await builder.getConfirmationOrderNumber();
  const orderRow = await findOrderByNumber(orderNumber);
  if (orderRow) cleanupOrder(orderRow.id);

  // Now go to /orders, click the row → /orders/[id]
  await page.goto("/orders");
  const firstRow = page.locator("main a.row-hover").first();
  await expect(firstRow).toBeVisible({ timeout: 10_000 });
  await firstRow.click();

  // Detail page renders the order number prominently
  await expect(page.locator("text=" + orderNumber).first()).toBeVisible({ timeout: 10_000 });
  // "Order Lines" eyebrow exists
  await expect(page.locator("div.t-eyebrow", { hasText: /^Order Lines/i })).toBeVisible();
  // Status timeline exists
  await expect(page.locator("div.t-eyebrow", { hasText: "Status Timeline" })).toBeVisible();
  // URL is /orders/<uuid>
  expect(page.url()).toMatch(/\/orders\/[0-9a-f-]{36}$/);
});

// ---------------------------------------------------------------------------
// P3-05 — admin can update order status
// ---------------------------------------------------------------------------
test("P3-05 admin can update an order's status from quoted to confirmed", async ({
  authenticatedPage,
  cleanupOrder,
}) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  const modal = new OptimizeModal(page);

  // Submit a fresh order
  await builder.catalogTitle.waitFor({ timeout: 10_000 });
  await builder.firstPlusButton().click();
  await expect(builder.summaryPanel.locator(".t-stat").first()).not.toHaveText("0.0", {
    timeout: 5_000,
  });
  const volBefore = await builder.getVolumePct();
  await builder.clickOptimize();
  await modal.waitForOpen();
  await expect(modal.applyButton("Fill From Catalog")).not.toBeDisabled({ timeout: 5_000 });
  await modal.applyFillCatalog();
  await modal.waitForClose();
  await builder.waitForVolumeChange(volBefore, 8_000);
  await builder.clickSubmit();
  await builder.waitForConfirmation();
  const orderNumber = await builder.getConfirmationOrderNumber();
  const orderRow = await findOrderByNumber(orderNumber);
  expect(orderRow).not.toBeNull();
  if (orderRow) cleanupOrder(orderRow.id);

  // Go to admin order detail
  await page.goto(`/admin/orders/${orderRow!.id}`);
  // Status select shows current status (quoted → "Submitted" label internally
  // is on the StatusPill, but the select element shows the underlying value).
  const select = page.locator("select").first();
  await expect(select).toHaveValue("quoted", { timeout: 10_000 });
  // Update to confirmed
  await select.selectOption("confirmed");
  await page.locator("button", { hasText: /Update status/i }).click();
  // Wait for the "Saved" indicator
  await expect(page.locator("span", { hasText: "Saved" })).toBeVisible({ timeout: 5_000 });
  // After revalidation, the select should reflect the new status
  await expect(select).toHaveValue("confirmed", { timeout: 10_000 });
});
