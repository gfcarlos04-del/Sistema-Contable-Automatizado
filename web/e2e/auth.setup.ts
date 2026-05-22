/**
 * Auth setup: logs in once with test credentials and saves the session
 * to e2e/.auth/user.json so all subsequent tests reuse it without
 * re-authenticating on every run.
 *
 * Required env vars (or defaults):
 *   E2E_USER_EMAIL    — defaults to test@tavex.test
 *   E2E_USER_PASSWORD — defaults to test1234567
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth", "user.json");

const EMAIL = process.env.E2E_USER_EMAIL ?? "test@tavex.test";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "test1234567";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/contraseña/i).fill(PASSWORD);
  await page.getByRole("button", { name: /^entrar/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL("/app", { timeout: 15_000 });
  await expect(page).toHaveURL("/app");

  await page.context().storageState({ path: AUTH_FILE });
});
