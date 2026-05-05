/**
 * Playwright global setup — generates one authenticated session for ALL tests.
 *
 * Why: Supabase magic links are single-use AND generating a new link for the same
 * email invalidates all previously issued links. With parallel workers, each worker
 * calling generate_link() would invalidate the others. The solution is to authenticate
 * ONCE in global setup, save the session cookies to a file, and have each test
 * restore that saved state (bypassing the auth fixture per-test token call).
 *
 * The saved state is written to tests/fixtures/.auth-state.json and is loaded
 * by the `authenticatedPage` fixture via Playwright's storageState mechanism.
 *
 * Sign-out tests use the `signOutPage` fixture which generates a FRESH session
 * per-test. This avoids invalidating the shared session when a test signs out.
 */

import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import path from "path";

export const AUTH_STATE_PATH = path.join(__dirname, ".auth-state.json");
export const TEST_EMAIL = "zchasse@atyourservous.com";
export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default async function globalSetup(_config: FullConfig) {
  // Load .env.local so env vars are available in the Node.js process.
  loadEnvConfig(path.join(__dirname, "../../"));

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "globalSetup: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local",
    );
  }

  // Generate one magic link token.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: TEST_EMAIL,
  });

  if (error) {
    throw new Error(`globalSetup: generateLink failed: ${error.message}`);
  }

  const token = (data as { properties?: { hashed_token?: string } })?.properties?.hashed_token;
  if (!token) {
    throw new Error("globalSetup: generateLink returned no hashed_token");
  }

  // Launch a headless browser, visit the callback, and save the session state.
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseUrl}/auth/callback?token_hash=${token}&type=magiclink`);
  await page.waitForURL(`${baseUrl}/`, { timeout: 20_000 });

  // Save the authenticated storage state (cookies + localStorage).
  await context.storageState({ path: AUTH_STATE_PATH });

  await browser.close();

  console.log(`[globalSetup] Auth session saved to ${AUTH_STATE_PATH}`);
}
