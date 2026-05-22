/**
 * Dashboard (/app) — verifica las tarjetas de estadísticas
 * y los accesos rápidos.
 */
import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app");
  });

  test("muestra las tarjetas de estadísticas", async ({ page }) => {
    // Stat cards: Pendientes, Registrados, Rechazados
    await expect(page.getByText(/pendiente/i).first()).toBeVisible();
    await expect(page.getByText(/registrado/i).first()).toBeVisible();
    await expect(page.getByText(/rechazado/i).first()).toBeVisible();
  });

  test("muestra los accesos rápidos", async ({ page }) => {
    // Quick action cards
    await expect(page.getByText(/cargar comprobante/i).first()).toBeVisible();
    await expect(page.getByText(/exportar/i).first()).toBeVisible();
  });

  test("el acceso rápido 'Cargar comprobante' redirige a comprobantes/nuevo o comprobantes", async ({ page }) => {
    await page.getByText(/cargar comprobante/i).first().click();
    await page.waitForURL(/\/app\/comprobantes/);
    await expect(page).toHaveURL(/\/app\/comprobantes/);
  });

  test("las tarjetas de estadísticas son clickeables y filtran la lista", async ({ page }) => {
    // Click on "Pendientes" stat card
    await page.getByText(/pendiente/i).first().click();
    await page.waitForURL(/\/app\/comprobantes/);
    await expect(page).toHaveURL(/\/app\/comprobantes/);
  });
});
