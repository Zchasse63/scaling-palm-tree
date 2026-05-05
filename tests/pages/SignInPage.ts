/**
 * Page Object Model — Sign-In page (/signin)
 *
 * Selectors are derived from src/components/auth/sign-in-form.tsx and
 * verified against the live DOM.
 */
import type { Page, Locator } from "@playwright/test";

export class SignInPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // The form uses id="email" on the input.
    this.emailInput = page.locator("#email");
    // The submit button is a <button type="submit"> with text "Send magic link".
    this.submitButton = page.locator('button[type="submit"]');
    // Error is a mono div rendered only when state.error is non-null.
    // It uses burgundy color and sits inside the form.
    this.errorMessage = page
      .locator("form")
      .locator("div.mono")
      .filter({ hasText: /./u });
    // Success state replaces the form — look for the "Check your inbox" section bar.
    this.successMessage = page.locator(".section-bar").filter({ hasText: "Check your inbox" });
  }

  async goto() {
    await this.page.goto("/signin");
  }

  async fillAndSubmit(email: string) {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }
}
