/**
 * Login page — tests que corren SIN sesión autenticada.
 */
import { test, expect } from "@playwright/test";

test.describe("Página de login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("muestra el formulario con campos email y contraseña", async ({ page }) => {
    await expect(page.getByLabel(/^email$/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^entrar/i })).toBeVisible();
  });

  test("muestra el nombre de la aplicación", async ({ page }) => {
    await expect(page.getByText("Tavex").first()).toBeVisible();
  });

  test("el botón está habilitado inicialmente", async ({ page }) => {
    await expect(page.getByRole("button", { name: /^entrar/i })).toBeEnabled();
  });

  test("muestra error con credenciales incorrectas", async ({ page }) => {
    await page.getByLabel(/^email$/i).fill("noexiste@test.com");
    await page.getByLabel(/contraseña/i).fill("contrasenawrong");
    await page.getByRole("button", { name: /^entrar/i }).click();

    // Should stay on login (Auth.js redirects back with error)
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("el campo email requiere formato válido (validación HTML5)", async ({ page }) => {
    await page.getByLabel(/^email$/i).fill("notanemail");
    await page.getByLabel(/contraseña/i).fill("somepassword");
    await page.getByRole("button", { name: /^entrar/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirige a /login si se accede a /app sin sesión", async ({ page }) => {
    await page.goto("/app");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirige a /login si se accede a /app/comprobantes sin sesión", async ({ page }) => {
    await page.goto("/app/comprobantes");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
