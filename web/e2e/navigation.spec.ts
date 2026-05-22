/**
 * Navigation — verifica que el sidebar y las rutas principales
 * sean accesibles con una sesión autenticada.
 */
import { test, expect } from "@playwright/test";

test.describe("Navegación autenticada", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app");
  });

  test("muestra el sidebar con el logo Tavex", async ({ page }) => {
    await expect(page.getByText("Tavex").first()).toBeVisible();
  });

  test("muestra el enlace de Inicio activo en /app", async ({ page }) => {
    const inicioLink = page.getByRole("link", { name: /inicio/i });
    await expect(inicioLink).toBeVisible();
  });

  test("navega a /app/clientes desde el sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /clientes/i }).click();
    await page.waitForURL(/\/app\/clientes/);
    await expect(page).toHaveURL(/\/app\/clientes/);
    await expect(page.getByRole("heading", { name: /clientes/i })).toBeVisible();
  });

  test("navega a /app/comprobantes desde el sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /comprobantes/i }).click();
    await page.waitForURL(/\/app\/comprobantes/);
    await expect(page).toHaveURL(/\/app\/comprobantes/);
  });

  test("navega a /app/exportaciones desde el sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /exportaciones/i }).click();
    await page.waitForURL(/\/app\/exportaciones/);
    await expect(page).toHaveURL(/\/app\/exportaciones/);
  });

  test("navega a /app/auditoria desde el sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /auditoría/i }).click();
    await page.waitForURL(/\/app\/auditoria/);
    await expect(page).toHaveURL(/\/app\/auditoria/);
  });

  test("navega a /app/perfil desde el avatar del sidebar", async ({ page }) => {
    // The user avatar/name in the footer links to /app/perfil
    await page.getByRole("link", { name: /app\/perfil/i }).click();
    await page.waitForURL(/\/app\/perfil/);
    await expect(page).toHaveURL(/\/app\/perfil/);
  });

  test("navega a /app/configuracion desde el sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /configuración/i }).click();
    await page.waitForURL(/\/app\/configuracion/);
    await expect(page).toHaveURL(/\/app\/configuracion/);
  });
});
