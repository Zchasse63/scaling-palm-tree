/**
 * Page Object Model — Builder page (/ and /?c=<slug>)
 *
 * Selectors verified against:
 *   src/components/builder/builder-client.tsx
 *   src/components/builder/summary-panel.tsx
 *   src/components/builder/product-table.tsx
 *   src/components/builder/product-row.tsx
 *   src/components/ui/stepper.tsx
 */
import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

export class BuilderPage {
  readonly page: Page;

  // Summary panel (aside element — sticky right column)
  readonly summaryPanel: Locator;
  readonly volumePctStat: Locator;
  readonly weightDisplay: Locator;
  readonly submitButton: Locator;
  readonly optimizeButton: Locator;
  readonly submitErrorBanner: Locator;
  readonly disabledReasonText: Locator;

  // Catalog header / title area
  readonly catalogTitle: Locator;

  constructor(page: Page) {
    this.page = page;

    // The aside is the summary panel; it's the only <aside> on the page.
    this.summaryPanel = page.locator("aside");

    // Volume stat: the large numeric display ("XX.X %") lives in a .t-stat element
    // inside the aside. We locate by the "%" sibling span.
    this.volumePctStat = this.summaryPanel.locator(".t-stat").first();

    // Weight: in the "Weight" section of the aside — locate by "/ 20,000 kg" text
    // (40HC US road-delivery payload cap; see src/lib/containers.ts).
    this.weightDisplay = this.summaryPanel.locator("text=/ 20,000 kg").first();

    // Submit button — only text that distinguishes it.
    this.submitButton = page.locator('button', { hasText: "Submit Container Order" });

    // Optimize button.
    this.optimizeButton = page.locator('button', { hasText: "Optimize Fill" });

    // Error banner: the burgundy div that appears when server action returns error.
    // It has inline style background: var(--burgundy) and contains uppercase text.
    this.submitErrorBanner = this.summaryPanel.locator("div[style*='--burgundy']");

    // Disabled reason: the small mono caption below the submit button.
    this.disabledReasonText = page.locator("div.mono").filter({ hasText: /below the minimum|over capacity|Volume is|minimum/i });

    // Catalog name in the .t-h2 above the table.
    this.catalogTitle = page.locator("div.t-h2").first();
  }

  /**
   * Navigate to the builder. With no argument, defaults to the foil catalog —
   * this preserves test compatibility now that the test customer has multiple
   * catalogs (and `/` would otherwise render the procurement dashboard).
   * Pass `null` to navigate to bare `/` (e.g., to test the dashboard).
   */
  async goto(slug: string | null = "foil-aluminum") {
    const url = slug ? `/?c=${slug}` : "/";
    await this.page.goto(url);
  }

  // ---------------------------------------------------------------------------
  // Catalog-wide first-SKU helpers (used in tests that don't care which SKU)
  // ---------------------------------------------------------------------------

  /** The first Increase (+) button in the catalog (any SKU). */
  firstPlusButton(): Locator {
    return this.page.locator('button[aria-label="Increase"]').first();
  }

  /** The first Decrease (−) button in the catalog (any SKU). */
  firstMinusButton(): Locator {
    return this.page.locator('button[aria-label="Decrease"]').first();
  }

  /** The first qty number input in the catalog (any SKU). */
  firstQtyInput(): Locator {
    return this.page.locator('input[type="number"]').first();
  }

  // ---------------------------------------------------------------------------
  // Per-SKU stepper helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the row element for a given product name substring.
   * The ProductRow renders inside a section with row-hover class.
   */
  skuRow(productNameSubstring: string): Locator {
    return this.page
      .locator("div.row-hover")
      .filter({ hasText: productNameSubstring });
  }

  /** The quantity input inside a given product row. */
  qtyInput(productNameSubstring: string): Locator {
    return this.skuRow(productNameSubstring).locator('input[type="number"]');
  }

  /** The minus (−) button inside a given product row. */
  minusButton(productNameSubstring: string): Locator {
    return this.skuRow(productNameSubstring).locator('button[aria-label="Decrease"]');
  }

  /** The plus (+) button inside a given product row. */
  plusButton(productNameSubstring: string): Locator {
    return this.skuRow(productNameSubstring).locator('button[aria-label="Increase"]');
  }

  /**
   * Sets qty on a row by clearing the input, typing the value, then blurring.
   * This triggers the Stepper's onBlur snap logic.
   * Waits for the input value to stabilize after blur.
   */
  async setQty(productNameSubstring: string, value: number | string): Promise<void> {
    const input = this.qtyInput(productNameSubstring);
    await input.click({ clickCount: 3 }); // select all
    await input.fill(String(value));
    await input.blur();
    // Wait for the input value to be consistent (React state settled).
    await expect(input).toHaveValue(/./, { timeout: 3_000 });
  }

  /** Read the current parsed qty from the input. */
  async getQty(productNameSubstring: string): Promise<number> {
    return parseInt((await this.qtyInput(productNameSubstring).inputValue()) || "0", 10);
  }

  /**
   * Reads the volume % from the summary panel stat display.
   * The stat shows "XX.X" in .t-stat, with "%" as a sibling.
   * The value is rendered via a Ticker component with a 90ms fade.
   */
  async getVolumePct(): Promise<number> {
    const text = await this.summaryPanel.locator(".t-stat").first().textContent();
    const match = (text ?? "").match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  /**
   * Waits until the volume display shows a value different from `currentValue`,
   * then returns the new volume. Useful after optimize or after adding items.
   * The Ticker component fades (90ms delay) before showing new values.
   */
  async waitForVolumeChange(currentValue: number, timeout = 5_000): Promise<number> {
    const currentStr = currentValue.toFixed(1);
    // Wait until the stat text changes.
    await expect(this.summaryPanel.locator(".t-stat").first()).not.toContainText(
      currentStr,
      { timeout }
    );
    return this.getVolumePct();
  }

  /** Returns the raw text content of the volume section (for empty-state checks). */
  async getVolumeCaption(): Promise<string> {
    // The mono caption below the progress bar.
    return (
      (await this.summaryPanel.locator("div.mono").filter({ hasText: /volume|capacity|cases/i }).first().textContent()) ?? ""
    );
  }

  /** True if the Submit button is enabled. */
  async isSubmitEnabled(): Promise<boolean> {
    return !(await this.submitButton.isDisabled());
  }

  /** True if the Optimize button is enabled. */
  async isOptimizeEnabled(): Promise<boolean> {
    return !(await this.optimizeButton.isDisabled());
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  async clickOptimize(): Promise<void> {
    await this.optimizeButton.click();
  }

  /**
   * Waits for the "Container Order Submitted" section bar to appear,
   * indicating the OrderConfirmation view is rendered.
   */
  async waitForConfirmation(): Promise<void> {
    await this.page.locator("h2.section-bar").filter({ hasText: "Container Order Submitted" }).waitFor({ timeout: 20_000 });
  }

  /**
   * Reads the order number displayed in the confirmation view meta slot.
   *
   * SectionBar renders:
   *   <h2 class="section-bar">
   *     <span class="label">
   *       <span class="reg" aria-hidden>+</span>
   *       <span>Container Order Submitted</span>
   *     </span>
   *     <span class="label">
   *       <span class="meta">{orderNumber}</span>   ← this is what we want
   *       <span class="reg" aria-hidden>+</span>
   *     </span>
   *   </h2>
   *
   * We read the .meta span inside the second .label to avoid capturing the
   * register-mark "+" character that textContent() on the .label itself includes.
   */
  async getConfirmationOrderNumber(): Promise<string> {
    const sectionBar = this.page.locator("h2.section-bar").filter({ hasText: "Container Order Submitted" });
    // The meta span is inside the second .label span.
    const metaSpan = sectionBar.locator(".label").last().locator(".meta");
    return ((await metaSpan.textContent()) ?? "").trim();
  }

  /**
   * Click the "Build Another <Catalog>" button on the confirmation view.
   * Phase D changed this label from a static "Build Another Container" to
   * "Build Another <displayName>" so the regex match below covers both.
   */
  async clickBuildAnother(): Promise<void> {
    await this.page
      .locator("button")
      .filter({ hasText: /Build Another/i })
      .first()
      .click();
  }

  /** Click "View Past Orders" in the confirmation view. */
  async clickViewPastOrders(): Promise<void> {
    await this.page.locator("a", { hasText: "View Past Orders" }).click();
  }
}
