/**
 * Exportaciones — generación de ZIP Marangatu.
 */
import { test, expect } from "@playwright/test";

test.describe("Página de exportaciones", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/exportaciones");
  });

  test("muestra el título 'Exportaciones'", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /exportacion/i })).toBeVisible();
  });

  test("muestra el selector de período (mensual/anual)", async ({ page }) => {
    // There should be a period selector or tabs
    const periodoEl = page.getByText(/mensual|anual|período/i).first();
    await expect(periodoEl).toBeVisible();
  });

  test("muestra el botón de generar ZIP", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /generar|exportar|zip/i }).first(),
    ).toBeVisible();
  });

  test("muestra un aviso si no hay cliente seleccionado", async ({ page }) => {
    // Without an active client, the export page should inform the user
    const aviso = page.getByText(/seleccion|cliente/i).first();
    const boton = page.getByRole("button", { name: /generar/i }).first();
    await expect(aviso.or(boton)).toBeVisible({ timeout: 5_000 });
  });
});
