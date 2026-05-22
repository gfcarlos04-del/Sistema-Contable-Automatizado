import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 *
 * Tests run against a local dev/test server.
 * Set E2E_BASE_URL to override (default: http://localhost:3000).
 *
 * Auth credentials for the test user:
 *   E2E_USER_EMAIL (default: test@tavex.test)
 *   E2E_USER_PASSWORD (default: test1234567)
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // sequential — shares DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    // Setup project: logs in once and saves the auth state
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // Main test project: reuses saved auth state
    {
      name: "chromium",
      testIgnore: /.*\.noauth\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
    // Tests that must run without authentication
    {
      name: "no-auth",
      testMatch: /.*\.noauth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Uncomment to start the dev server automatically when running e2e tests:
  // webServer: {
  //   command: "npm run dev",
  //   url: "http://localhost:3000",
  //   reuseExistingServer: true,
  //   timeout: 120_000,
  // },
});
