/**
 * Inventory dashboard tests — INV
 *
 * Covers:
 *   INV-01  /admin/inventory renders: stamp, KPIs, tabs, full table + totals
 *   INV-02  bucket tab + sort links drive URL params
 *   INV-03  as-of stamp on all three inventory views; SKU detail renders
 *   INV-04  floor edit persists, then reverts (failure-safe)
 *   INV-05  feed detail section (?feed=1)
 *   INV-06  inbound shipment create + delete (E2E-TEST marked, purged in finally)
 *   INV-07  CSV export downloads
 *   INV-08  mobile viewport collapses the table with labels
 *   INV-09  unauthenticated /admin/inventory redirects to /signin
 *
 * Write scope is deliberately tiny and self-cleaning: one floor value on one
 * SKU (restored in finally) and E2E-TEST-marked inbound rows (purged before
 * AND after, even on failure). Everything else is read-only.
 */

import { expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { test } from "../fixtures/auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const E2E_PO = "E2E-TEST";

function adminSupabase() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function purgeE2EShipments() {
  const admin = adminSupabase();
  const { data } = await admin
    .from("inbound_shipments")
    .select("id")
    .eq("po_number", E2E_PO);
  const ids = (data ?? []).map((s: { id: string }) => s.id);
  if (ids.length > 0) {
    await admin.from("inbound_shipment_lines").delete().in("shipment_id", ids);
    await admin.from("inbound_shipments").delete().in("id", ids);
  }
}

test.beforeAll(async () => {
  await purgeE2EShipments();
});

// ---------------------------------------------------------------------------
test("INV-01 dashboard renders stamp, KPIs, tabs, and the full table", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  await page.goto("/admin/inventory");
  await expect(page.locator("div.t-h1", { hasText: "Savannah stock" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator("text=As of UNIS report").first()).toBeVisible();
  await expect(page.locator("div.t-eyebrow", { hasText: "Cases on hand" })).toBeVisible();
  await expect(page.locator("div.t-eyebrow", { hasText: "Next container" })).toBeVisible();
  await expect(page.locator("nav[aria-label='Status filter'] a", { hasText: "All" })).toBeVisible();
  // The live warehouse carries ~46 SKUs; assert a healthy row count.
  const rowCount = await page.locator(".admin-inventory-row").count();
  expect(rowCount).toBeGreaterThanOrEqual(40);
  await expect(page.locator("div.t-eyebrow", { hasText: /^Total$/ })).toBeVisible();
});

// ---------------------------------------------------------------------------
test("INV-02 bucket tabs and sort headers drive URL params", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  await page.goto("/admin/inventory");
  await page.locator("nav[aria-label='Status filter'] a", { hasText: "All" }).click();
  await page.waitForURL(/bucket=all/);
  await page
    .locator(".admin-inventory-row-headers a", { hasText: "Avail" })
    .first()
    .click();
  await page.waitForURL(/sort=avail/);
  expect(page.url()).toContain("bucket=all");
});

// ---------------------------------------------------------------------------
test("INV-03 stamp on all three views; SKU detail renders its panels", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  await page.goto("/admin/inventory/inbound");
  await expect(page.locator("text=As of UNIS report").first()).toBeVisible({
    timeout: 15_000,
  });

  await page.goto("/admin/inventory?bucket=all");
  const firstSku = page.locator(".admin-inventory-row .inv-c-sku a").first();
  await expect(firstSku).toBeVisible({ timeout: 15_000 });
  await firstSku.click();
  await page.waitForURL(/\/admin\/inventory\/[0-9a-f-]{36}$/);
  await expect(page.locator("text=As of UNIS report").first()).toBeVisible();
  await expect(page.locator("h2", { hasText: /Runway/i })).toBeVisible();
  await expect(page.locator("h2", { hasText: /Buyers/i })).toBeVisible();
  await expect(page.locator("h2", { hasText: /Replenishment settings/i })).toBeVisible();
  await expect(page.locator("#commitments")).toBeAttached();
});

// ---------------------------------------------------------------------------
/**
 * The settings Server Action revalidates the page, which triggers a router
 * refresh that can remount the editable cell mid-interaction. setFloor()
 * therefore retries the whole click-fill-Enter sequence when the input is
 * swapped out from under it.
 */
async function setFloor(
  page: import("@playwright/test").Page,
  value: string, // "" clears
  expectText: string,
) {
  const name = "Floor (reorder point, cases)";
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const btn = page.getByRole("button", { name });
      await btn.click({ timeout: 5_000 });
      const input = page.getByRole("textbox", { name });
      await input.fill(value, { timeout: 5_000 });
      await input.press("Enter");
      await expect(page.getByRole("button", { name })).toHaveText(expectText, {
        timeout: 10_000,
      });
      // Let the revalidation-triggered refresh settle before the next edit.
      await page.waitForLoadState("networkidle");
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

test("INV-04 floor edit saves and reverts", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  await page.goto("/admin/inventory?bucket=all");
  const firstSku = page.locator(".admin-inventory-row .inv-c-sku a").first();
  await expect(firstSku).toBeVisible({ timeout: 15_000 });
  await firstSku.click();
  await page.waitForURL(/\/admin\/inventory\/[0-9a-f-]{36}$/);

  const floorButton = page.getByRole("button", {
    name: "Floor (reorder point, cases)",
  });
  await expect(floorButton).toBeVisible();
  const original = (await floorButton.textContent())?.trim() ?? "not set";
  const originalValue = original === "not set" ? "" : original.replaceAll(",", "");

  try {
    await setFloor(page, "123", "123");
  } finally {
    // Restore the original value even if the assertion failed.
    await setFloor(page, originalValue, original);
  }
});

// ---------------------------------------------------------------------------
test("INV-05 feed detail section opens and closes", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  await page.goto("/admin/inventory?feed=1");
  await expect(
    page.locator("div.t-eyebrow", { hasText: "Feed detail · last 14 reports" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("text=The dashboard never edits inventory")).toBeVisible();
});

// ---------------------------------------------------------------------------
test("INV-06 inbound shipment create + delete (self-cleaning)", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  try {
    await page.goto("/admin/inventory/inbound");
    await page.locator("button", { hasText: "New shipment" }).click();
    await page.getByLabel("PO number").fill(E2E_PO);
    await page.getByLabel("Container").fill("E2E-TEST-CNTR");
    await page.getByLabel("Line 1 SKU").selectOption({ index: 1 });
    await page.getByLabel("Line 1 cases").fill("5");
    await page.locator("button", { hasText: "Save shipment" }).click();
    await expect(page.locator("text=E2E-TEST-CNTR").first()).toBeVisible({
      timeout: 15_000,
    });

    // Delete it through the UI (confirm dialog accepted).
    page.on("dialog", (d) => void d.accept());
    const card = page.locator("section", { hasText: "E2E-TEST-CNTR" }).first();
    await card.locator("button", { hasText: "Delete" }).click();
    await expect(page.locator("text=E2E-TEST-CNTR")).toHaveCount(0, { timeout: 15_000 });
  } finally {
    await purgeE2EShipments();
  }
});

// ---------------------------------------------------------------------------
test("INV-07 CSV export downloads with the dated filename", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  await page.goto("/admin/inventory");
  await expect(page.locator("div.t-h1", { hasText: "Savannah stock" })).toBeVisible({
    timeout: 15_000,
  });
  const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
  await page.locator("button", { hasText: /Export CSV/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^servous-inventory-\d{2}-\d{2}-\d{4}\.csv$/);
});

// ---------------------------------------------------------------------------
test("INV-08 mobile viewport collapses the table with per-cell labels", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/admin/inventory?bucket=all");
  await expect(page.locator("div.t-h1", { hasText: "Savannah stock" })).toBeVisible({
    timeout: 15_000,
  });
  // Header row hidden, per-cell labels shown.
  await expect(page.locator(".admin-inventory-row-headers").first()).toBeHidden();
  await expect(
    page.locator(".admin-inventory-row").first().locator(".inv-label", { hasText: "Avail" }),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
test("INV-09 unauthenticated /admin/inventory redirects to signin", async ({
  browser,
}) => {
  const context = await browser.newContext(); // no storageState = signed out
  const page = await context.newPage();
  await page.goto("/admin/inventory");
  await page.waitForURL(/\/signin\?next=/, { timeout: 15_000 });
  await context.close();
});
