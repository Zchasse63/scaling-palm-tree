/**
 * Phase C — Draft persistence (autosave + hydrate + atomic submit cleanup)
 * Phase D — Header status badges + submit-and-continue
 *
 * Covers:
 *   P0-18  Type qty → reload → cart still has the qty (draft hydrated)
 *   P0-19  Submit order → reload builder → cart is empty (draft was cleared)
 *   P0-20  Header dropdown shows "Draft · N cs" badge for the OTHER catalog
 *          when that catalog has an active draft
 *   P1-27  Catalog switcher dropdown surfaces last-order relative date
 *   P1-28  OrderConfirmation suggests continuing with the other catalog
 *          when the customer has more than one
 */

import { test, expect } from "../fixtures/auth";
import { BuilderPage } from "../pages/BuilderPage";

// Wait long enough for the 1s autosave debounce to fire + DB roundtrip.
const AUTOSAVE_WINDOW_MS = 1_500;

// ---------------------------------------------------------------------------
// P0-18 — Draft hydrates on reload
// ---------------------------------------------------------------------------
test("P0-18 typed qty persists across reload via draft hydration", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Pick a SKU with a known minimum (foil rolls = pack 200).
  // Type 200 into the first foil-roll input.
  const firstInput = builder.firstQtyInput();
  await firstInput.click({ clickCount: 3 });
  await firstInput.fill("200");
  await firstInput.blur();

  // Wait for autosave debounce + roundtrip.
  await page.waitForTimeout(AUTOSAVE_WINDOW_MS);

  // Reload — server-side draft hydration should restore the qty.
  await page.reload();
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Same input should still hold the value.
  const reloadedValue = await builder.firstQtyInput().inputValue();
  expect(reloadedValue).toBe("200");

  // The "Cart auto-saved" affordance should be visible.
  await expect(page.getByText(/Cart auto-saved/i)).toBeVisible();
});

// ---------------------------------------------------------------------------
// P0-19 — Submit clears the draft so reload gives an empty cart
// ---------------------------------------------------------------------------
test("P0-19 successful submit clears the draft (reload shows empty cart)", async ({ authenticatedPage, cleanupOrder }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Optimize-fill to 100% then submit.
  // Optimize Fill is disabled when cart is empty. Seed one item first.
  const seedInput = builder.firstQtyInput();
  await seedInput.click({ clickCount: 3 });
  await seedInput.fill("200");
  await seedInput.blur();
  await page.waitForTimeout(300);

  await page.locator("button", { hasText: "Optimize Fill" }).click();
  await page.locator("button", { hasText: "Apply Suggestions" }).click({ timeout: 8_000 });
  await page.waitForTimeout(500);
  await page.locator("button", { hasText: "Submit Container Order" }).click();

  // Wait for confirmation, capture order number for cleanup.
  await page.locator("h2.section-bar").filter({ hasText: "Container Order Submitted" }).waitFor({ timeout: 20_000 });
  const orderNumber = await builder.getConfirmationOrderNumber();
  // Look up the order id for cleanup.
  const { findOrderByNumber } = await import("../fixtures/auth");
  const row = await findOrderByNumber(orderNumber);
  if (row) cleanupOrder(row.id);

  // Reload the builder — the draft should be gone, qty inputs should all be 0.
  await page.goto("/?c=foil-aluminum");
  await builder.catalogTitle.waitFor({ timeout: 10_000 });
  const firstQty = await builder.firstQtyInput().inputValue();
  expect(firstQty).toBe("0");

  // No "Cart auto-saved" affordance since there's no draft.
  await expect(page.getByText(/Cart auto-saved/i)).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// P0-20 — Header dropdown shows "Draft · N cs" badge for catalogs with drafts
// ---------------------------------------------------------------------------
test("P0-20 header switcher shows draft-pending badge for the other catalog", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Open plastics, type a qty, autosave, navigate back to foil.
  await page.goto("/?c=plastics");
  await builder.catalogTitle.waitFor({ timeout: 10_000 });
  // Plastics MOQ = 200; pick the first SKU.
  const plasticsInput = builder.firstQtyInput();
  await plasticsInput.click({ clickCount: 3 });
  await plasticsInput.fill("200");
  await plasticsInput.blur();
  await page.waitForTimeout(AUTOSAVE_WINDOW_MS);

  // Now go back to foil and open the catalog dropdown.
  await page.goto("/?c=foil-aluminum");
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // The header center has a clickable catalog title with a caret. Click it.
  await page.getByText("Foil & Aluminum Products").first().click();

  // The dropdown should list "Plastics & Disposables" with a Draft badge.
  await expect(page.getByText(/Draft\s*·\s*200\s*cs/i)).toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// P1-28 — OrderConfirmation suggests continuing with the other catalog
// ---------------------------------------------------------------------------
test("P1-28 confirmation page shows submit-and-continue prompt for the other catalog", async ({ authenticatedPage, cleanupOrder }) => {
  const page = authenticatedPage;
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });

  // Optimize Fill is disabled when cart is empty. Seed one item first.
  const seedInput = builder.firstQtyInput();
  await seedInput.click({ clickCount: 3 });
  await seedInput.fill("200");
  await seedInput.blur();
  await page.waitForTimeout(300);

  await page.locator("button", { hasText: "Optimize Fill" }).click();
  await page.locator("button", { hasText: "Apply Suggestions" }).click({ timeout: 8_000 });
  await page.waitForTimeout(500);
  await page.locator("button", { hasText: "Submit Container Order" }).click();

  await page.locator("h2.section-bar").filter({ hasText: "Container Order Submitted" }).waitFor({ timeout: 20_000 });

  // Capture order for cleanup.
  const orderNumber = await builder.getConfirmationOrderNumber();
  const { findOrderByNumber } = await import("../fixtures/auth");
  const row = await findOrderByNumber(orderNumber);
  if (row) cleanupOrder(row.id);

  // The confirmation should propose the OTHER catalog (Plastics, since they
  // just submitted Foil and Plastics has no order history yet for the test
  // customer in this test session).
  await expect(
    page.getByRole("button").filter({ hasText: /Plastics & Disposables/i }),
  ).toBeVisible({ timeout: 5_000 });

  // The "Build Another Foil" button should still appear as a fallback.
  await expect(
    page.getByRole("button").filter({ hasText: /Build Another Foil/i }),
  ).toBeVisible();
});
