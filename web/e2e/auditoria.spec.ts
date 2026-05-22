/**
 * Auditoría — log de cambios.
 */
import { test, expect } from "@playwright/test";

test.describe("Página de auditoría", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/auditoria");
  });

  test("muestra el título 'Auditoría'", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /auditor/i })).toBeVisible();
  });

  test("muestra encabezados de tabla o mensaje de lista vacía", async ({ page }) => {
    const tabla = page.getByRole("table");
    const sinRegistros = page.getByText(/sin registros|no hay|vacío|empty/i);
    await expect(tabla.or(sinRegistros).first()).toBeVisible({ timeout: 5_000 });
  });
});
