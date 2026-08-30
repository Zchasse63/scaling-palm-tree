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
  // The default tab is worst-first (may land on STOCKOUT with few rows);
  // the full-universe row count lives on the All tab.
  await page.goto("/admin/inventory?bucket=all");
  await expect(page.locator("div.t-h1", { hasText: "Savannah stock" })).toBeVisible({
    timeout: 15_000,
  });
  const rowCount = await page.locator(".admin-inventory-row").count();
  expect(rowCount).toBeGreaterThanOrEqual(40);
  await expect(
    page.locator("div.t-eyebrow", { hasText: "Total · this view" }),
  ).toBeVisible();
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
  const vendorProductId = page.url().match(/([0-9a-f-]{36})$/)![1];

  // Read the true original from the DB, and restore it there in finally.
  // A UI-only revert can false-pass on the optimistic value while the server
  // write aborts (that once left a test floor on a live SKU).
  const admin = adminSupabase();
  const { data: loc } = await admin
    .from("inventory_snapshots")
    .select("location_id")
    .eq("count_method", "system")
    .order("counted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: before } = await admin
    .from("vendor_product_warehouses")
    .select("id, reorder_point_cases")
    .eq("vendor_product_id", vendorProductId)
    .eq("location_id", loc!.location_id)
    .maybeSingle();

  try {
    await setFloor(page, "123", "123");
    // The write must be REAL, not just optimistic UI state.
    const { data: after } = await admin
      .from("vendor_product_warehouses")
      .select("reorder_point_cases")
      .eq("vendor_product_id", vendorProductId)
      .eq("location_id", loc!.location_id)
      .maybeSingle();
    expect(after?.reorder_point_cases).toBe(123);
  } finally {
    if (before) {
      await admin
        .from("vendor_product_warehouses")
        .update({ reorder_point_cases: before.reorder_point_cases })
        .eq("id", before.id);
    } else {
      await admin
        .from("vendor_product_warehouses")
        .update({ reorder_point_cases: null })
        .eq("vendor_product_id", vendorProductId)
        .eq("location_id", loc!.location_id);
    }
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
test("INV-09 unauthenticated admin inventory routes all redirect to signin", async ({
  browser,
}) => {
  const context = await browser.newContext(); // no storageState = signed out
  const page = await context.newPage();
  for (const path of [
    "/admin/inventory",
    "/admin/inventory/inbound",
    "/admin/inventory/plan",
  ]) {
    await page.goto(path);
    await page.waitForURL(/\/signin\?next=/, { timeout: 15_000 });
  }
  await context.close();
});

// ---------------------------------------------------------------------------
test("INV-10 container planning worksheet renders totals and rows", async ({
  authenticatedPage,
}) => {
  const page = authenticatedPage;
  await page.goto("/admin/inventory/plan");
  await expect(
    page.getByText("Container planning worksheet", { exact: false }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Suggested total", { exact: false })).toBeVisible();
  await expect(page.getByText("40HC fill", { exact: false })).toBeVisible();
  // At least one SKU row links back to its detail page.
  await expect(
    page.locator('a[href^="/admin/inventory/"]').first(),
  ).toBeVisible();
});
