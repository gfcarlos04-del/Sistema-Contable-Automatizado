/**
 * Password recovery flow — tests que corren SIN sesión autenticada.
 */
import { test, expect } from "@playwright/test";

test.describe("Flujo de recuperación de contraseña", () => {
  test("desde /login, el link '¿Olvidaste tu contraseña?' navega a /olvide", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /olvidaste tu contraseña/i }).click();
    await expect(page).toHaveURL(/\/olvide/);
  });

  test.describe("Página /olvide", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/olvide");
    });

    test("muestra el título 'Recuperar contraseña' y el campo email", async ({ page }) => {
      await expect(page.getByRole("heading", { name: /recuperar contraseña/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /enviar enlace de recuperación/i }),
      ).toBeVisible();
    });

    test("rechaza email mal formado (validación HTML5 previene el submit)", async ({ page }) => {
      await page.getByLabel(/email/i).fill("notanemail");
      await page.getByRole("button", { name: /enviar enlace de recuperación/i }).click();
      // El form no debe hacer submit — seguimos en /olvide sin mensaje de éxito
      await expect(page).toHaveURL(/\/olvide/);
      await expect(page.getByText(/si el email existe/i)).not.toBeVisible();
    });

    test("submit con email válido muestra mensaje de éxito anti-enumeration", async ({ page }) => {
      await page.getByLabel(/email/i).fill("noexiste@test.com");
      await page.getByRole("button", { name: /enviar enlace de recuperación/i }).click();
      await expect(page.getByText(/si el email existe/i)).toBeVisible({
        timeout: 10_000,
      });
    });

    test("tiene link 'Volver al login' que navega a /login", async ({ page }) => {
      await expect(page.getByRole("link", { name: /volver al login/i })).toBeVisible();
      await page.getByRole("link", { name: /volver al login/i }).click();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Página /reset/[token]", () => {
    test("token inválido muestra 'Enlace inválido' y botón 'Solicitar uno nuevo'", async ({
      page,
    }) => {
      await page.goto("/reset/token-invalido-cualquiera");
      await expect(page.getByText(/enlace inválido/i)).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        page.getByRole("button", { name: /solicitar uno nuevo/i }).first(),
      ).toBeVisible();
    });

    test("click en 'Solicitar uno nuevo' navega a /olvide", async ({ page }) => {
      await page.goto("/reset/token-invalido-cualquiera");
      await page
        .getByRole("button", { name: /solicitar uno nuevo/i })
        .first()
        .click();
      await expect(page).toHaveURL(/\/olvide/, { timeout: 10_000 });
    });
  });
});
