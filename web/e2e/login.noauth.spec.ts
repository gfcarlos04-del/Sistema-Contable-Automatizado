/**
 * Login page — tests that run WITHOUT an authenticated session.
 * Covers: UI rendering, client-side validation, redirect on success.
 */
import { test, expect } from "@playwright/test";

test.describe("Página de login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("muestra el formulario con campos email y contraseña", async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible();
  });

  test("muestra el nombre de la aplicación", async ({ page }) => {
    await expect(page.getByText("Tavex")).toBeVisible();
  });

  test("el botón está habilitado inicialmente", async ({ page }) => {
    await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeEnabled();
  });

  test("muestra error con credenciales incorrectas", async ({ page }) => {
    await page.getByLabel(/email/i).fill("noexiste@test.com");
    await page.getByLabel(/contraseña/i).fill("contrasenawrong");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();

    // Should stay on login page and show an error
    await expect(page).toHaveURL(/\/login/);
    // Error message should appear (Auth.js renders it as a query param or in the page)
    await expect(
      page.getByText(/credencial|inválid|incorrect|error/i).first(),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("el campo email requiere formato válido (validación HTML5)", async ({ page }) => {
    await page.getByLabel(/email/i).fill("notanemail");
    await page.getByLabel(/contraseña/i).fill("somepassword");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();
    // HTML5 validation prevents submit — we should still be on the login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirige a /login si se intenta acceder a /app sin sesión", async ({ page }) => {
    await page.goto("/app");
    await page.waitForURL(/\/login/, { timeout: 8_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirige a /login si se intenta acceder a /app/comprobantes sin sesión", async ({ page }) => {
    await page.goto("/app/comprobantes");
    await page.waitForURL(/\/login/, { timeout: 8_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
