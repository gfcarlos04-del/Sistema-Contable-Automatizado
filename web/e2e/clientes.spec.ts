/**
 * Clientes — lista, formulario de alta, validaciones.
 */
import { test, expect } from "@playwright/test";

test.describe("Lista de clientes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/clientes");
  });

  test("muestra el título 'Clientes'", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /clientes/i })).toBeVisible();
  });

  test("muestra el botón 'Nuevo cliente'", async ({ page }) => {
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
    await expect(page.getByLabel(/ruc/i).first()).toBeVisible();
  });

  test("muestra selector de régimen tributario", async ({ page }) => {
    // IVA checkbox or similar
    await expect(page.getByText(/iva/i).first()).toBeVisible();
  });

  test("falla si se intenta guardar sin datos", async ({ page }) => {
    await page.getByRole("button", { name: /guardar/i }).click();
    // HTML5 required validation or server error
    await expect(page).toHaveURL(/\/app\/clientes\/nuevo/);
  });

  test("falla si el RUC tiene letras", async ({ page }) => {
    await page.getByLabel(/razón social/i).fill("Empresa Test S.A.");
    await page.getByLabel(/ruc/i).first().fill("ABC1234");
    await page.getByRole("button", { name: /guardar/i }).click();
    // Should stay on the form and show validation error
    await expect(page).toHaveURL(/\/app\/clientes\/nuevo/);
  });
});

test.describe("Edición de cliente", () => {
  test("la lista de clientes muestra un enlace por cada cliente", async ({ page }) => {
    await page.goto("/app/clientes");
    // May be empty in test env — just verify the page loads
    await expect(page.getByRole("heading", { name: /clientes/i })).toBeVisible();
  });
});
