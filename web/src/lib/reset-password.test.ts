import { describe, it, expect } from "vitest";
import {
  generarTokenReset,
  hashearToken,
  expiraEnMinutos,
  buildResetUrl,
  RESET_TOKEN_TTL_MIN,
  RESET_TOKEN_BYTES,
} from "./reset-password";

// ── Constantes ────────────────────────────────────────────────────────────────

describe("Constantes", () => {
  it("RESET_TOKEN_TTL_MIN es 60", () => {
    expect(RESET_TOKEN_TTL_MIN).toBe(60);
  });

  it("RESET_TOKEN_BYTES es 32", () => {
    expect(RESET_TOKEN_BYTES).toBe(32);
  });
});

// ── generarTokenReset ─────────────────────────────────────────────────────────

describe("generarTokenReset", () => {
  it("devuelve tokenPlano como string no vacío", () => {
    const { tokenPlano } = generarTokenReset();
    expect(typeof tokenPlano).toBe("string");
    expect(tokenPlano.length).toBeGreaterThan(0);
  });

  it("tokenPlano tiene formato base64url (solo [A-Za-z0-9_-])", () => {
    const { tokenPlano } = generarTokenReset();
    expect(tokenPlano).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("tokenHash es hex de 64 caracteres (SHA-256)", () => {
    const { tokenHash } = generarTokenReset();
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("dos llamadas seguidas producen tokens diferentes (entropía)", () => {
    const first = generarTokenReset();
    const second = generarTokenReset();
    expect(first.tokenPlano).not.toBe(second.tokenPlano);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it("el hash es determinístico: coincide con hashearToken del mismo tokenPlano", () => {
    const { tokenPlano, tokenHash } = generarTokenReset();
    expect(hashearToken(tokenPlano)).toBe(tokenHash);
  });
});

// ── hashearToken ──────────────────────────────────────────────────────────────

describe("hashearToken", () => {
  it("devuelve string de 64 caracteres", () => {
    expect(hashearToken("cualquier-input")).toHaveLength(64);
  });

  it("mismo input produce mismo output (determinístico)", () => {
    expect(hashearToken("abc")).toBe(hashearToken("abc"));
  });

  it("diferente input produce diferente output", () => {
    expect(hashearToken("abc")).not.toBe(hashearToken("xyz"));
  });

  it("cadena vacía produce un hash válido de 64 caracteres", () => {
    const h = hashearToken("");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ── expiraEnMinutos ───────────────────────────────────────────────────────────

describe("expiraEnMinutos", () => {
  it("devuelve un Date en el futuro para minutos > 0", () => {
    const ahora = Date.now();
    const fecha = expiraEnMinutos(60);
    expect(fecha.getTime()).toBeGreaterThan(ahora);
  });

  it("60 min adelante = ahora + 60*60*1000 (±1s tolerancia)", () => {
    const antes = Date.now();
    const fecha = expiraEnMinutos(60);
    const despues = Date.now();
    const esperadoMin = antes + 60 * 60 * 1000;
    const esperadoMax = despues + 60 * 60 * 1000;
    expect(fecha.getTime()).toBeGreaterThanOrEqual(esperadoMin - 1000);
    expect(fecha.getTime()).toBeLessThanOrEqual(esperadoMax + 1000);
  });

  it("0 minutos ≈ ahora (±1s tolerancia)", () => {
    const antes = Date.now();
    const fecha = expiraEnMinutos(0);
    const despues = Date.now();
    expect(fecha.getTime()).toBeGreaterThanOrEqual(antes - 1000);
    expect(fecha.getTime()).toBeLessThanOrEqual(despues + 1000);
  });
});

// ── buildResetUrl ─────────────────────────────────────────────────────────────

describe("buildResetUrl", () => {
  it("concatena base + /reset/ + token", () => {
    const url = buildResetUrl("https://example.com", "mitoken");
    expect(url).toBe("https://example.com/reset/mitoken");
  });

  it("elimina trailing slash de baseUrl para evitar doble slash", () => {
    const url = buildResetUrl("https://example.com/", "mitoken");
    expect(url).toBe("https://example.com/reset/mitoken");
  });

  it("URL-encoda caracteres especiales en el token", () => {
    const url = buildResetUrl("https://example.com", "tok en+con/especiales");
    expect(url).toBe("https://example.com/reset/tok%20en%2Bcon%2Fespeciales");
  });

  it("tokens base64url estándar no necesitan encoding adicional", () => {
    const token = "abc123_-ABC";
    const url = buildResetUrl("https://example.com", token);
    expect(url).toBe(`https://example.com/reset/${token}`);
  });
});
