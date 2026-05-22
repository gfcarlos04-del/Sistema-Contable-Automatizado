/**
 * Navegación autenticada — sidebar y rutas principales.
 */
import { test, expect } from "@playwright/test";

test.describe("Navegación autenticada", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app");
  });

  test("muestra el logo Tavex en el sidebar", async ({ page }) => {
    await expect(page.getByText("Tavex").first()).toBeVisible();
  });

  test("tiene enlace 'Inicio' en el sidebar", async ({ page }) => {
    await expect(page.getByRole("link", { name: /^inicio/i })).toBeVisible();
  });

  test("navega a /app/clientes haciendo click en el sidebar", async ({ page }) => {
    // En el sidebar puede haber múltiples elementos con "Clientes"; uso el link
    await page.getByRole("link", { name: /^clientes/i }).first().click();
    await page.waitForURL(/\/app\/clientes/);
    await expect(page).toHaveURL(/\/app\/clientes/);
  });

  test("navega a /app/comprobantes desde el sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /^comprobantes/i }).first().click();
    await page.waitForURL(/\/app\/comprobantes/);
  });

  test("navega a /app/exportaciones desde el sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /^exportaciones/i }).first().click();
    await page.waitForURL(/\/app\/exportaciones/);
  });

  test("navega a /app/auditoria desde el sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /auditor/i }).first().click();
    await page.waitForURL(/\/app\/auditoria/);
  });

  test("navega a /app/perfil al hacer click en el avatar del footer", async ({ page }) => {
    // El link al perfil tiene title="Mi perfil" — busco por title attribute
    await page.locator('a[href="/app/perfil"]').first().click();
    await page.waitForURL(/\/app\/perfil/);
    await expect(page).toHaveURL(/\/app\/perfil/);
  });

  test("navega a /app/configuracion desde el sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /configuraci/i }).first().click();
    await page.waitForURL(/\/app\/configuracion/);
  });

  test("usuarios admin pueden ver el link a /app/usuarios", async ({ page }) => {
    await expect(page.getByRole("link", { name: /^usuarios/i })).toBeVisible();
  });
});
