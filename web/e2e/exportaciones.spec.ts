/**
 * Exportaciones — generación de ZIP Marangatu.
 */
import { test, expect } from "@playwright/test";

test.describe("Página de exportaciones", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/exportaciones");
  });

  test("muestra el título 'Exportaciones'", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^exportaciones/i })).toBeVisible();
  });

  test("muestra la sección 'Generar exportación' o aviso de seleccionar cliente", async ({
    page,
  }) => {
    const generar = page.getByRole("heading", { name: /generar exportaci/i });
    const aviso = page.getByText(/seleccion.*cliente/i);
    await expect(generar.or(aviso).first()).toBeVisible({ timeout: 5_000 });
  });

  test("muestra la sección 'Exportaciones anteriores' (si hay cliente activo)", async ({
    page,
  }) => {
    const seccion = page.getByRole("heading", { name: /exportaciones anteriores/i });
    const aviso = page.getByText(/seleccion.*cliente/i);
    await expect(seccion.or(aviso).first()).toBeVisible({ timeout: 5_000 });
  });
});
