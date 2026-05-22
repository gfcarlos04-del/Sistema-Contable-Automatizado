/**
 * Comprobantes — lista y DropZone.
 * Tests resilientes: si no hay cliente activo, varios elementos no aparecen.
 */
import { test, expect } from "@playwright/test";

test.describe("Lista de comprobantes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/comprobantes");
  });

  test("muestra el título 'Comprobantes'", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^comprobantes/i })).toBeVisible();
  });

  test("muestra el filtro por estado (cuando hay cliente activo)", async ({ page }) => {
    const selectEstado = page.locator('select[name="estado"]');
    const aviso = page.getByText(/seleccion.*cliente/i);
    // Una de las dos cosas debe estar
    await expect(selectEstado.or(aviso).first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("DropZone (subida de archivos)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/comprobantes");
  });

  test("el input de archivos acepta los MIMEs correctos", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    if (!(await fileInput.count())) {
      test.skip();
      return;
    }
    await expect(fileInput).toHaveAttribute("multiple", "");
    const accept = await fileInput.getAttribute("accept");
    expect(accept ?? "").toMatch(/pdf|image/);
  });

  test("rechaza archivo .txt con error 'Tipo no permitido'", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    if (!(await fileInput.count())) {
      test.skip();
      return;
    }
    await fileInput.setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("contenido"),
    });
    await expect(page.getByText(/tipo no permitido/i)).toBeVisible({ timeout: 5_000 });
  });

  test("rechaza archivo > 20 MB", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    if (!(await fileInput.count())) {
      test.skip();
      return;
    }
    const largeBuffer = Buffer.alloc(21 * 1024 * 1024);
    await fileInput.setInputFiles({
      name: "large.pdf",
      mimeType: "application/pdf",
      buffer: largeBuffer,
    });
    await expect(page.getByText(/20 MB/i)).toBeVisible({ timeout: 5_000 });
  });
});
