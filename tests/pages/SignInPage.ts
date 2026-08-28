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
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // The form uses id="email" / id="password" on the inputs.
    this.emailInput = page.locator("#email");
    this.passwordInput = page.locator("#password");
    // The submit button is a <button type="submit"> with text "Sign in".
    this.submitButton = page.locator('button[type="submit"]');
    // Error is a mono div rendered only when sign-in fails.
    this.errorMessage = page
      .locator("form")
      .locator("div.mono")
      .filter({ hasText: /./u });
  }

  async goto() {
    await this.page.goto("/signin");
  }

  async fillAndSubmit(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
