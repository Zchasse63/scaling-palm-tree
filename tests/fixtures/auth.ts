/**
 * Auth fixture for Playwright tests.
 *
 * Strategy: a single Supabase magic-link session is generated in globalSetup
 * and saved to tests/fixtures/.auth-state.json. Each test that needs an
 * authenticated page restores that saved state (no per-test token generation).
 *
 * Sign-out tests (P0-11, P1-16) use the `signOutPage` fixture which generates
 * a FRESH session per-test via a new magic link. This is necessary because
 * signing out invalidates the Supabase server-side session, which would break
 * subsequent tests that restore the same storageState. The sign-out tests run
 * with an isolated session that can be freely destroyed without affecting others.
 *
 * Provides `cleanupOrder(id)` — call with the order UUID after a test that
 * submits an order. The AfterEach hook deletes lines + header from the DB.
 */

import { test as base, type Page, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { AUTH_STATE_PATH, TEST_EMAIL, BASE_URL } from "./global-setup";
import { chromium } from "@playwright/test";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a service-role Supabase client (bypasses RLS). */
function adminSupabase() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Generates a fresh Supabase magic link session for the test email.
 * Used by sign-out tests that need an isolated session they can destroy.
 * Returns a new authenticated BrowserContext.
 */
async function createFreshAuthContext(browser: import("@playwright/test").Browser): Promise<BrowserContext> {
  const admin = adminSupabase();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: TEST_EMAIL,
  });

  if (error) throw new Error(`createFreshAuthContext: generateLink failed: ${error.message}`);
  const token = (data as { properties?: { hashed_token?: string } })?.properties?.hashed_token;
  if (!token) throw new Error("createFreshAuthContext: generateLink returned no hashed_token");

  // Launch a headless context, authenticate via the magic link callback.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/auth/callback?token_hash=${token}&type=magiclink`);
  await page.waitForURL(`${BASE_URL}/`, { timeout: 20_000 });
  await page.close();
  return context;
}

// ---------------------------------------------------------------------------
// Fixture types
// ---------------------------------------------------------------------------

type AuthFixtures = {
  /** A page that is already authenticated and on "/" — uses shared globalSetup session. */
  authenticatedPage: Page;
  /**
   * A page that is authenticated with a FRESH session, for use by sign-out tests.
   * This session can be invalidated without affecting other tests.
   */
  signOutPage: Page;
  /**
   * Register an order ID for teardown. The AfterEach hook deletes
   * customer_order_lines + customer_orders rows for each registered ID.
   */
  cleanupOrder: (orderId: string) => void;
};

// ---------------------------------------------------------------------------
// Extended test + expect
// ---------------------------------------------------------------------------

export const test = base.extend<AuthFixtures>({
  // cleanupOrder fixture — collects IDs during the test, deletes after.
  // eslint-disable-next-line no-empty-pattern
  cleanupOrder: async ({}, use) => {
    const toClean: string[] = [];
    const register = (id: string) => toClean.push(id);

    await use(register);

    if (toClean.length > 0) {
      const admin = adminSupabase();
      // Delete lines first (FK), then headers.
      await admin
        .from("customer_order_lines")
        .delete()
        .in("order_id", toClean);
      await admin
        .from("customer_orders")
        .delete()
        .in("id", toClean);
    }
  },

  // authenticatedPage fixture — restores the pre-built auth session from globalSetup.
  // Each test gets a fresh browser context with the saved cookies; no new token needed.
  //
  // Navigation default: lands on the foil catalog builder (`/?c=foil-aluminum`).
  // The test customer has multiple catalogs since Phase B, so bare `/` renders
  // the procurement dashboard. Tests that want the dashboard must navigate to
  // bare `/` themselves via `await page.goto("/")`.
  //
  // Phase C: clears all draft_orders for the test customer before each test
  // so autosaved drafts from a previous test don't leak into the next.
  authenticatedPage: async ({ browser }, use) => {
    // Wipe drafts for the test customer to ensure a clean cart on every test.
    const admin = adminSupabase();
    const TEST_CUSTOMER_ID = "68f5af45-d9b2-4f74-83c0-3275df0d6fa1";
    await admin.from("draft_orders").delete().eq("customer_id", TEST_CUSTOMER_ID);

    // Restore the auth state saved by global setup.
    const context = await browser.newContext({
      storageState: AUTH_STATE_PATH,
    });
    const page = await context.newPage();

    // Navigate to the foil builder by default to preserve test compatibility.
    await page.goto("/?c=foil-aluminum");
    await page.waitForURL(/\/\?c=foil-aluminum/, { timeout: 15_000 });

    await use(page);

    await context.close();
  },

  // signOutPage fixture — creates a FRESH session for sign-out tests.
  // The fresh session is isolated: signing out here does NOT affect the shared session.
  signOutPage: async ({ browser }, use) => {
    const context = await createFreshAuthContext(browser);
    const page = await context.newPage();
    await page.goto("/?c=foil-aluminum");
    await page.waitForURL(/\/\?c=foil-aluminum/, { timeout: 15_000 });

    await use(page);

    // Context may be in a signed-out state; close it.
    await context.close().catch(() => null);
  },
});

export { expect } from "@playwright/test";

/** Directly delete an order by ID using the admin client (useful in helpers). */
export async function deleteOrder(orderId: string): Promise<void> {
  const admin = adminSupabase();
  await admin.from("customer_order_lines").delete().eq("order_id", orderId);
  await admin.from("customer_orders").delete().eq("id", orderId);
}

/** Look up an order by order_number string; returns null if not found. */
export async function findOrderByNumber(
  orderNumber: string,
): Promise<{ id: string; order_number: string } | null> {
  const admin = adminSupabase();
  const { data } = await admin
    .from("customer_orders")
    .select("id, order_number")
    .eq("order_number", orderNumber)
    .maybeSingle();
  return data as { id: string; order_number: string } | null;
}
