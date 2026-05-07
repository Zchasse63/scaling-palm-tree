/**
 * Page Object Model — Optimize Fill modal (three-panel redesign).
 *
 * The modal renders three side-by-side strategies, each with its own Apply
 * button:
 *   - Top Up Cart
 *   - Match Items
 *   - Fill From Catalog
 *
 * There is no single "Apply Suggestions" button anymore. Each panel has its
 * own Apply that's disabled when that strategy yields no suggestions.
 *
 * Selectors verified against:
 *   src/components/builder/optimize-modal.tsx
 */
import type { Page, Locator } from "@playwright/test";

export type OptimizeStrategy = "Top Up Cart" | "Match Items" | "Fill From Catalog";

export class OptimizeModal {
  readonly page: Page;
  readonly modal: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('[role="dialog"][aria-modal="true"]');
    this.cancelButton = this.modal.locator("button", { hasText: "Cancel" });
  }

  async waitForOpen(): Promise<void> {
    await this.modal.waitFor({ state: "visible", timeout: 10_000 });
  }

  async waitForClose(): Promise<void> {
    await this.modal.waitFor({ state: "hidden", timeout: 10_000 });
  }

  /** Returns the <section> for one strategy panel. */
  panel(strategy: OptimizeStrategy): Locator {
    // Each panel's header has the strategy label as a styled div with
    // textTransform: uppercase. We locate the section by header text.
    return this.modal.locator("section").filter({ hasText: strategy }).first();
  }

  /** Apply button for a specific panel. */
  applyButton(strategy: OptimizeStrategy): Locator {
    return this.panel(strategy).locator("button", { hasText: "Apply" }).first();
  }

  async applyTopUp(): Promise<void> {
    await this.applyButton("Top Up Cart").click();
  }

  async applyMatchItems(): Promise<void> {
    await this.applyButton("Match Items").click();
  }

  async applyFillCatalog(): Promise<void> {
    await this.applyButton("Fill From Catalog").click();
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /** Suggestion-row count inside one specific panel. */
  async suggestionCountInPanel(strategy: OptimizeStrategy): Promise<number> {
    // Each suggestion row contains the "→" arrow inside a `.mono` span.
    return this.panel(strategy).locator("div.mono", { hasText: "→" }).count();
  }

  /** True if the panel's Apply button is disabled (no suggestions). */
  async isApplyDisabled(strategy: OptimizeStrategy): Promise<boolean> {
    return this.applyButton(strategy).isDisabled();
  }
}
