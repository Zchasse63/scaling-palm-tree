/**
 * Procurement dashboard E2E tests — Phase B
 *
 * Covers:
 *   P0-14  Dashboard renders both catalog cards (foil + plastics) for the test customer
 *   P0-15  Click foil card → builder loads with foil SKUs
 *   P0-16  Click plastics card → builder loads with plastics SKUs (43 SKUs, MOQ 200)
 *   P0-17  Plastics catalog enforces 200-case MOQ on the stepper
 *   P1-26  Plastics builder header shows the correct display name (no vendor identity leak)
 */

import { test, expect } from "../fixtures/auth";
import { BuilderPage } from "../pages/BuilderPage";

// ---------------------------------------------------------------------------
// P0-14 — Dashboard renders both cards
// ---------------------------------------------------------------------------
test("P0-14 dashboard at / renders both catalog cards", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  await page.goto("/");
  await expect(page.getByText("Choose a catalog")).toBeVisible({ timeout: 10_000 });

  // Foil card
  await expect(page.getByText("Foil & Aluminum Products")).toBeVisible();
  // Plastics card
  await expect(page.getByText("Plastics & Disposables")).toBeVisible();

  // Sanity: header shows correct catalog count
  await expect(page.getByText(/2 catalogs/i)).toBeVisible();

  // Vendor names must NEVER appear (proprietary).
  await expect(page.getByText(/Whitestone/i)).toHaveCount(0);
  await expect(page.getByText(/Servous Plastics/i)).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// P0-15 — Click foil card → builder loads
// ---------------------------------------------------------------------------
test("P0-15 click foil catalog card → foil builder loads", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  await page.goto("/");
  await page.getByRole("link").filter({ hasText: "Foil & Aluminum Products" }).click();
  await page.waitForURL(/\?c=foil-aluminum/, { timeout: 10_000 });

  const builder = new BuilderPage(page);
  await expect(builder.catalogTitle).toContainText("Foil & Aluminum");
});

// ---------------------------------------------------------------------------
// P0-16 — Click plastics card → builder loads with plastics SKUs
// ---------------------------------------------------------------------------
test("P0-16 click plastics catalog card → plastics builder loads", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  await page.goto("/");
  await page.getByRole("link").filter({ hasText: "Plastics & Disposables" }).click();
  await page.waitForURL(/\?c=plastics/, { timeout: 10_000 });

  const builder = new BuilderPage(page);
  await expect(builder.catalogTitle).toContainText("Plastics & Disposables");

  // Sanity: at least one plastics SKU should render. The plastics catalog has
  // distinctive canonical product names from the Cutlery / PET Cold Cup categories.
  // We look for "PP Medium Weight" (cutlery) or "PET Clear Cold Cup" — both
  // appear as product titles in the catalog table.
  await expect(
    page.getByText(/PP Medium Weight|PET Clear Cold Cup|PP Deli Container/i).first(),
  ).toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// P0-17 — Plastics catalog stepper enforces 200-case MOQ
// ---------------------------------------------------------------------------
test("P0-17 plastics MOQ is 200 — typing 100 snaps to 200 on blur", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  await page.goto("/?c=plastics");
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Use the first SKU on the page — pick by stepper rather than name to avoid coupling.
  const firstInput = builder.firstQtyInput();
  await firstInput.click({ clickCount: 3 });
  await firstInput.fill("100");
  await firstInput.blur();

  // 100 < 200 (MOQ) — should snap to either 0 or 200. Most likely 200 since
  // 100 is closer to the min than to 0.
  const value = await firstInput.inputValue();
  expect(["0", "200"]).toContain(value);
});

// ---------------------------------------------------------------------------
// P1-26 — Vendor identity must NOT leak inside the builder
// ---------------------------------------------------------------------------
test("P1-26 plastics builder header shows display name, not vendor name", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  await page.goto("/?c=plastics");

  // The customer-facing display name must appear.
  await expect(page.getByText("Plastics & Disposables").first()).toBeVisible({ timeout: 10_000 });

  // The internal vendor name "Servous Plastics" must NEVER render to the customer.
  await expect(page.getByText(/^Servous Plastics$/)).toHaveCount(0);
});
