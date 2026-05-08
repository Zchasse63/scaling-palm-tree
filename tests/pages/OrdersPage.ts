/**
 * Page Object Model — Orders history page (/orders)
 *
 * Selectors verified against:
 *   src/app/orders/page.tsx
 */
import type { Page, Locator } from "@playwright/test";

export class OrdersPage {
  readonly page: Page;
  readonly emptyState: Locator;
  readonly buildContainerButton: Locator;
  readonly orderRows: Locator;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page = page;

    // Empty state renders a "No container orders yet" heading inside a white box.
    this.emptyState = page.locator("div.t-h2", { hasText: "No container orders yet" });

    // "Build a Container" button in the header area (when orders exist).
    // Also "Choose a catalog" button in the empty state.
    this.buildContainerButton = page.locator("a[href='/']").locator("button");

    // Order rows — each row has the class "row-hover" inside the table.
    // Rows are <a class="row-hover"> (links to the detail page); pin the
    // selector to the orders main so it doesn't catch catalog row-hovers
    // on other pages.
    this.orderRows = page.locator("main a.row-hover");

    // Page heading.
    this.pageTitle = page.locator("div.t-h1", { hasText: "Container orders" });
  }

  async goto() {
    await this.page.goto("/orders");
    await this.pageTitle.waitFor({ timeout: 10_000 });
  }

  /** Returns the number of order rows in the table (0 if empty state). */
  async orderCount(): Promise<number> {
    return this.orderRows.count();
  }

  /**
   * Returns the text content of all cells in a specific row (by 0-based index).
   * The row grid has 8 columns: Order #, Date, Catalog, Container, Lines, Cases, Total, Status.
   */
  async getRowText(rowIndex: number): Promise<string[]> {
    const row = this.orderRows.nth(rowIndex);
    // Each cell in the grid is a direct child div.
    const cells = await row.locator("> div").allTextContents();
    return cells.map((c) => c.trim());
  }

  /** Returns the order number from a specific row (first column). */
  async getOrderNumber(rowIndex: number): Promise<string> {
    const cells = await this.getRowText(rowIndex);
    return cells[0] ?? "";
  }

  /** Returns the status text from a specific row (last column). */
  async getStatus(rowIndex: number): Promise<string> {
    const row = this.orderRows.nth(rowIndex);
    // Status pill is the last direct child.
    return (await row.locator("> div").last().textContent()) ?? "";
  }

  /**
   * Find the row index for a given order number.
   * Returns -1 if not found.
   */
  async findRowByOrderNumber(orderNumber: string): Promise<number> {
    const count = await this.orderRows.count();
    for (let i = 0; i < count; i++) {
      const num = await this.getOrderNumber(i);
      if (num.trim() === orderNumber) return i;
    }
    return -1;
  }
}
