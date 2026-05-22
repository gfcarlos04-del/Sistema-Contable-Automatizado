/**
 * Clientes — lista y formulario de alta.
 */
import { test, expect } from "@playwright/test";

test.describe("Lista de clientes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/clientes");
  });

  test("muestra el título 'Clientes'", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^clientes/i })).toBeVisible();
  });

  test("muestra un enlace para crear nuevo cliente", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /nuevo cliente/i }),
    ).toBeVisible();
  });
});

test.describe("Formulario de nuevo cliente", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/clientes/nuevo");
  });

  test("muestra los campos obligatorios", async ({ page }) => {
    await expect(page.getByLabel(/razón social/i)).toBeVisible();
    await expect(page.getByLabel(/^ruc/i)).toBeVisible();
  });

  test("muestra el selector de régimen tributario", async ({ page }) => {
    // El form usa checkboxes con name="regimen"
    await expect(page.locator('input[name="regimen"]').first()).toBeAttached();
  });

  test("muestra el botón 'Crear cliente'", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /crear cliente/i }),
    ).toBeVisible();
  });

  test("el campo razón social es required (HTML5 lo previene)", async ({ page }) => {
    await page.getByRole("button", { name: /crear cliente/i }).click();
    // HTML5 validation impide enviar: seguimos en la misma URL
    await expect(page).toHaveURL(/\/app\/clientes\/nuevo/);
  });
});
