/**
 * Sign-out tests — P0-11 and P1-16
 *
 * These tests are in a SEPARATE FILE from auth.spec.ts because they must run
 * LAST. When a sign-out test uses the signOutPage fixture (which generates a
 * fresh magic link and verifies it), Supabase may invalidate any existing
 * sessions for the same email. Running last ensures the shared session from
 * globalSetup has already been used by all other tests.
 *
 * Covers:
 *   P0-11  Sign out → /signin
 *   P1-16  Sign out → back button → /signin (middleware re-redirects)
 */

import { expect } from "@playwright/test";
import { test } from "../fixtures/auth";

// ---------------------------------------------------------------------------
// Helper: sign out via the Account menu popover
// ---------------------------------------------------------------------------
async function signOut(page: import("@playwright/test").Page) {
  const accountMenuBtn = page.locator('button[aria-label="Account menu"]');
  await accountMenuBtn.waitFor({ timeout: 10_000 });
  await accountMenuBtn.click();

  const signOutBtn = page.locator('button[type="submit"]', { hasText: "Sign out" });
  await signOutBtn.waitFor({ timeout: 5_000 });
  await signOutBtn.click();
}

// ---------------------------------------------------------------------------
// P0-11 — Sign out redirects to /signin
// Uses signOutPage (fresh isolated session) to not poison the shared session.
// ---------------------------------------------------------------------------
test("P0-11 sign-out redirects to /signin", async ({ signOutPage }) => {
  const page = signOutPage;
  await signOut(page);
  await page.waitForURL(/\/signin/, { timeout: 10_000 });
  expect(page.url()).toContain("/signin");
});

// ---------------------------------------------------------------------------
// P1-16 — Sign out → browser back → middleware re-redirects to /signin
// Uses signOutPage (fresh isolated session) to not poison the shared session.
// ---------------------------------------------------------------------------
test("P1-16 sign-out then back-button re-redirects to /signin", async ({ signOutPage }) => {
  const page = signOutPage;
  // Sign out via account menu.
  await signOut(page);
  await page.waitForURL(/\/signin/, { timeout: 10_000 });

  // Simulate browser back (goes to the previous page URL, which was /).
  // Use Promise.race — the redirect may already be in progress before waitForURL registers.
  await Promise.all([
    page.waitForURL(/\/signin/, { timeout: 10_000 }).catch(() => null),
    page.goBack(),
  ]);

  // If back-button cached the page (bfcache), force a navigation to confirm gating.
  if (!page.url().includes("/signin")) {
    await page.reload();
    await page.waitForURL(/\/signin/, { timeout: 10_000 });
  }

  expect(page.url()).toContain("/signin");
});
