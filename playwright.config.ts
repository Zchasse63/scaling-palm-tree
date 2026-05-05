import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Load .env.local so NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// are available both to Playwright workers and to the auth fixture.
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: "./tests/e2e",
  // Run tests sequentially to avoid Supabase refresh-token rotation race:
  // multiple browser contexts restoring the same storageState simultaneously
  // can invalidate each other's sessions when Supabase rotates the refresh token.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "html" : [["list"], ["html", { open: "never" }]],

  // Global setup runs once before all tests — generates the auth session.
  globalSetup: "./tests/fixtures/global-setup.ts",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Reuse the already-running dev server when present (avoids killing it on
  // test runs); start one only if nothing's there.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/signin",
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 60_000,
  },
});
