/**
 * Dashboard (/app) — la vista varía según haya o no un cliente activo.
 * Estos tests son tolerantes a ambas variantes.
 */
import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app");
  });

  test("muestra el saludo de bienvenida", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /bienvenid/i })).toBeVisible();
  });

  test("muestra al menos una tarjeta de estadística", async ({ page }) => {
    // Either "Clientes registrados" + "Comprobantes totales" (no cliente activo)
    // o las tarjetas Pendientes/Registrados/Rechazados (cliente activo)
    const anyStatLabel = page.getByText(
      /clientes registrados|comprobantes totales|pendiente|registrado|rechazad/i,
    );
    await expect(anyStatLabel.first()).toBeVisible();
  });

  test("ofrece navegación hacia clientes o comprobantes", async ({ page }) => {
    const anyCTA = page.getByRole("link", {
      name: /clientes|comprobantes|cargar|exportar/i,
    });
    await expect(anyCTA.first()).toBeVisible();
  });
});
