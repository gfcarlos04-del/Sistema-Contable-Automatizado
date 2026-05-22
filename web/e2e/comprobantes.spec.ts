/**
 * Comprobantes — lista, filtros, subida de archivos (DropZone).
 */
import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Lista de comprobantes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/comprobantes");
  });

  test("muestra el título de la página", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /comprobante/i })).toBeVisible();
  });

  test("muestra el selector de estado en el panel de filtros", async ({ page }) => {
    await expect(page.getByRole("combobox").first()).toBeVisible();
  });

  test("muestra la zona de carga (DropZone) cuando hay cliente seleccionado o muestra aviso", async ({ page }) => {
    // Either the dropzone is visible, or there's a "seleccioná un cliente" notice
    const dropzone = page.getByRole("button", { name: /zona de carga/i });
    const notice = page.getByText(/seleccion/i);
    await expect(dropzone.or(notice).first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("DropZone", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/comprobantes");
  });

  test("la zona de carga acepta el click para abrir el selector de archivos", async ({ page }) => {
    const dropzone = page.getByRole("button", { name: /zona de carga/i });

    // If no client is selected, the dropzone might not be visible
    if (!(await dropzone.isVisible())) {
      test.skip();
      return;
    }

    // The hidden file input should exist
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    await expect(fileInput).toHaveAttribute("multiple");
    await expect(fileInput).toHaveAttribute("accept", /pdf/i);
  });

  test("rechaza archivos de tipo no permitido y muestra error", async ({ page }) => {
    const dropzone = page.getByRole("button", { name: /zona de carga/i });
    if (!(await dropzone.isVisible())) {
      test.skip();
      return;
    }

    // Upload a .txt file (not allowed)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("test content"),
    });

    // Should show "Tipo no permitido" error
    await expect(page.getByText(/tipo no permitido/i)).toBeVisible({ timeout: 5_000 });
  });

  test("rechaza archivos mayores a 20 MB", async ({ page }) => {
    const dropzone = page.getByRole("button", { name: /zona de carga/i });
    if (!(await dropzone.isVisible())) {
      test.skip();
      return;
    }

    // Simulate a large file (>20MB)
    const largeBuffer = Buffer.alloc(21 * 1024 * 1024); // 21 MB
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "large.pdf",
      mimeType: "application/pdf",
      buffer: largeBuffer,
    });

    await expect(page.getByText(/20 MB/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Filtros de comprobantes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/comprobantes");
  });

  test("el filtro de estado tiene las opciones del spec", async ({ page }) => {
    const select = page.getByRole("combobox").first();
    await expect(select).toBeVisible();

    const options = await select.locator("option").allTextContents();
    const optionTexts = options.join(" ").toLowerCase();

    expect(optionTexts).toContain("todo");
    // At least one of the estados
    const tieneEstado =
      optionTexts.includes("pendiente") ||
      optionTexts.includes("registrado") ||
      optionTexts.includes("rechazado");
    expect(tieneEstado).toBe(true);
  });
});
