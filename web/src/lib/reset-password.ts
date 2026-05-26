/**
 * Lógica de tokens para reset de contraseña.
 *
 * - Generamos un token aleatorio de 32 bytes (256 bits) en base64url.
 * - Guardamos solo el SHA-256 del token (nunca el token plano).
 * - El token vive 1 hora.
 * - Un único token activo por solicitud; al usarlo se marca `usadoEn`.
 */

import crypto from "node:crypto";

export const RESET_TOKEN_TTL_MIN = 60;
export const RESET_TOKEN_BYTES = 32;

export function generarTokenReset(): { tokenPlano: string; tokenHash: string } {
  const tokenPlano = crypto.randomBytes(RESET_TOKEN_BYTES).toString("base64url");
  const tokenHash = hashearToken(tokenPlano);
  return { tokenPlano, tokenHash };
}

export function hashearToken(tokenPlano: string): string {
  return crypto.createHash("sha256").update(tokenPlano).digest("hex");
}

export function expiraEnMinutos(min: number): Date {
  return new Date(Date.now() + min * 60_000);
}

export function buildResetUrl(baseUrl: string, tokenPlano: string): string {
  const cleaned = baseUrl.replace(/\/$/, "");
  return `${cleaned}/reset/${encodeURIComponent(tokenPlano)}`;
}
