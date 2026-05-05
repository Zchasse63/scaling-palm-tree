/**
 * Page Object Model — Optimize Fill modal
 *
 * Selectors verified against:
 *   src/components/builder/optimize-modal.tsx
 */
import type { Page, Locator } from "@playwright/test";

export class OptimizeModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly tabTopUp: Locator;
  readonly tabMatchItems: Locator;
  readonly tabFillCatalog: Locator;
  readonly applyButton: Locator;
  readonly cancelButton: Locator;
  readonly statusLine: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;

    // The modal is a [role="dialog"] with [aria-modal="true"].
    this.modal = page.locator('[role="dialog"][aria-modal="true"]');

    // Three tabs inside the tablist.
    this.tabTopUp = this.modal.locator('[role="tab"]', { hasText: "Top up cart" });
    this.tabMatchItems = this.modal.locator('[role="tab"]', { hasText: "Match items" });
    this.tabFillCatalog = this.modal.locator('[role="tab"]', { hasText: "Fill from catalog" });

    // Buttons in the modal footer.
    this.applyButton = this.modal.locator("button", { hasText: "Apply Suggestions" });
    this.cancelButton = this.modal.locator("button", { hasText: "Cancel" });

    // The statusLine is in the SectionBar meta slot — the second .label span.
    // "Suggested fill: XX.X%" or "No changes available" etc.
    this.statusLine = this.modal.locator("h2.section-bar .label").last();

    // Empty state message shown when no suggestions exist.
    this.emptyState = this.modal.locator("div[style*='text-align: center'], div[style*='textAlign']").filter({ hasText: /No suggestions|No complementary|Add at least|Weight ceiling/i });
  }

  async waitForOpen(): Promise<void> {
    await this.modal.waitFor({ state: "visible", timeout: 10_000 });
  }

  async waitForClose(): Promise<void> {
    await this.modal.waitFor({ state: "hidden", timeout: 10_000 });
  }

  async selectTopUp(): Promise<void> {
    await this.tabTopUp.click();
  }

  async selectMatchItems(): Promise<void> {
    await this.tabMatchItems.click();
  }

  async selectFillCatalog(): Promise<void> {
    await this.tabFillCatalog.click();
  }

  /** Count the suggestion rows (SKU deltas) shown in the modal body. */
  async suggestionCount(): Promise<number> {
    // Each suggestion row is a grid div inside the scroll area with format: spec | current | → | suggested | delta.
    // They appear after the header row and before the empty-state message.
    // We identify them by containing the "→" arrow text which appears in each non-header row.
    return this.modal.locator("div.mono", { hasText: "→" }).count();
  }

  async clickApply(): Promise<void> {
    await this.applyButton.click();
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /** Returns the text of the status line in the SectionBar. */
  async getStatusText(): Promise<string> {
    return (await this.statusLine.textContent()) ?? "";
  }

  /** True if the Top up cart tab has aria-selected="false" and is disabled. */
  async isTopUpDisabled(): Promise<boolean> {
    return this.tabTopUp.isDisabled();
  }

  /** True if the Apply Suggestions button is disabled (no suggestions). */
  async isApplyDisabled(): Promise<boolean> {
    return this.applyButton.isDisabled();
  }
}
