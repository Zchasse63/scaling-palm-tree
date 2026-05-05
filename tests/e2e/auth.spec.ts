/**
 * Auth flow tests — P0 and P1
 *
 * Covers:
 *   P0-02  Unauthenticated / → /signin redirect
 *   P0-03  Unauthenticated /orders → /signin redirect
 *   P0-01  Magic-link sign-in → builder lands on /
 *   P1-13  Garbage token_hash → /signin?error=callback_failed
 *   P1-14  /?c=foil-aluminum while unauth → /signin
 *   P1-15  /?c=does-not-exist while auth'd → no crash, no loop (intermittent session loss)
 *   P0-12  Open redirect clamped (https://evil.example.com)
 *   P2-06  Open redirect clamped (//evil.example.com)
 *   P2-07  /auth/ prefix in next param clamped
 *   P1-25  Single-catalog auto-redirect
 *
 * NOTE: P0-11 (sign-out) and P1-16 (sign-out back-button) are in z-signout.spec.ts
 * which runs last (alphabetically). This avoids invalidating the shared session
 * before all authenticated tests have completed.
 */

import { expect } from "@playwright/test";
import { test } from "../fixtures/auth";
import { BuilderPage } from "../pages/BuilderPage";

// ---------------------------------------------------------------------------
// P0-02 — Unauthenticated / redirects to /signin
// ---------------------------------------------------------------------------
test("P0-02 unauthenticated root redirects to /signin", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/signin/, { timeout: 10_000 });
  expect(page.url()).toContain("/signin");
});

// ---------------------------------------------------------------------------
// P0-03 — Unauthenticated /orders redirects to /signin
// ---------------------------------------------------------------------------
test("P0-03 unauthenticated /orders redirects to /signin", async ({ page }) => {
  await page.goto("/orders");
  await page.waitForURL(/\/signin/, { timeout: 10_000 });
  expect(page.url()).toContain("/signin");
});

// ---------------------------------------------------------------------------
// P0-01 — Magic-link auth fixture lands on /
// ---------------------------------------------------------------------------
test("P0-01 magic-link sign-in lands on builder", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  expect(page.url()).toContain("/");
  // The catalog title should be visible — confirms builder loaded.
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });
  const title = await builder.catalogTitle.textContent();
  expect(title).toBeTruthy();
});

// ---------------------------------------------------------------------------
// P1-13 — Garbage token_hash → /signin?error=callback_failed
// ---------------------------------------------------------------------------
test("P1-13 garbage token_hash redirects to /signin with error", async ({ page }) => {
  await page.goto("/auth/callback?token_hash=totallygarbagetoken&type=magiclink");
  await page.waitForURL(/\/signin/, { timeout: 10_000 });
  expect(page.url()).toContain("error=callback_failed");
});

// ---------------------------------------------------------------------------
// P1-14 — /?c=foil-aluminum while unauthenticated → /signin
// ---------------------------------------------------------------------------
test("P1-14 /?c=foil-aluminum unauthenticated redirects to /signin", async ({ page }) => {
  await page.goto("/?c=foil-aluminum");
  await page.waitForURL(/\/signin/, { timeout: 10_000 });
  expect(page.url()).toContain("/signin");
});

// ---------------------------------------------------------------------------
// P1-15 — /?c=does-not-exist while authenticated: no crash, no infinite loop
//
// INTERMITTENT BUG (BUG-001): When the Next.js page component calls redirect("/")
// after failing to resolve the catalog slug, the session cookies refreshed by
// middleware may not be propagated before the redirect fires. This can cause
// the follow-up GET "/" to fail the middleware auth check and redirect to /signin.
//
// The behavior is timing-dependent: sometimes the session survives (lands on "/"),
// sometimes it is lost (lands on "/signin"). Either outcome is observable.
//
// Critical invariants this test enforces:
//   1. No 500 / Application error is shown
//   2. Session is preserved (no redirect to /signin)
//   3. The page renders a usable catalog view (not a redirect loop)
//
// Behavior contract (after BUG-001 fix): an invalid `?c=<slug>` no longer
// triggers a server-side redirect (which raced with middleware cookie
// propagation and intermittently nuked the session). Instead, the server
// silently falls back to the customer's first available catalog and renders
// the builder for it. URL stays at `/?c=<bad-slug>` — that's fine. The
// customer doesn't lose their session over a typo.
// ---------------------------------------------------------------------------
test("P1-15 /?c=does-not-exist authenticated stays signed in and renders builder", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  await page.goto("/?c=does-not-exist");

  // Page should fully load, not redirect to /signin.
  await page.waitForLoadState("networkidle");
  const finalUrl = page.url();

  // INVARIANT 1: No 500 / app error.
  const body = await page.textContent("body");
  expect(body).not.toContain("Internal Server Error");
  expect(body).not.toContain("Application error");

  // INVARIANT 2: Session preserved — must NOT have been pushed to /signin.
  expect(finalUrl).not.toContain("/signin");

  // INVARIANT 3: A signed-in chrome surface renders. The "Container Builder"
  // eyebrow only shows in the dark header, which only shows when the customer
  // is authed and a catalog has resolved.
  await expect(page.getByText(/Container Builder/i).first()).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// P0-12 — Open redirect clamped (full HTTPS URL)
// ---------------------------------------------------------------------------
test("P0-12 open redirect with https:// is clamped to /", async ({ page }) => {
  await page.goto("/auth/callback?token_hash=garbage&type=magiclink&next=https://evil.example.com");
  await page.waitForURL(/\/signin/, { timeout: 10_000 });
  expect(page.url()).not.toContain("evil.example.com");
  expect(page.url()).toContain("signin");
});

// ---------------------------------------------------------------------------
// P2-06 — Open redirect clamped (protocol-relative //)
// ---------------------------------------------------------------------------
test("P2-06 open redirect with // is clamped to /", async ({ page }) => {
  await page.goto("/auth/callback?token_hash=garbage&type=magiclink&next=//evil.example.com");
  await page.waitForURL(/\/signin/, { timeout: 10_000 });
  expect(page.url()).not.toContain("evil.example.com");
  expect(page.url()).toContain("signin");
});

// ---------------------------------------------------------------------------
// P2-07 — /auth/ prefix in next param clamped to /
// ---------------------------------------------------------------------------
test("P2-07 open redirect with /auth/ prefix is clamped to /", async ({ page }) => {
  await page.goto("/auth/callback?token_hash=garbage&type=magiclink&next=/auth/callback");
  await page.waitForURL(/\/signin/, { timeout: 10_000 });
  expect(page.url()).not.toMatch(/\/auth\/callback/);
});

// ---------------------------------------------------------------------------
// P1-25 — Auto-redirect single catalog (verified within auth flow)
// ---------------------------------------------------------------------------
test("P1-25 single-catalog customer auto-redirects to builder on /", async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  // Test customer has exactly one catalog (foil-aluminum / Whitestone).
  expect(page.url()).toMatch(/localhost:3000\/$/);
  const builder = new BuilderPage(page);
  await builder.catalogTitle.waitFor({ timeout: 10_000 });
});
