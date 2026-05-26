"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  buildResetUrl,
  expiraEnMinutos,
  generarTokenReset,
  RESET_TOKEN_TTL_MIN,
} from "@/lib/reset-password";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function solicitarReset(email: string): Promise<ActionResult> {
  const raw = email.trim().toLowerCase();
  if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    return { ok: false, error: "Email inválido." };
  }

  // SIEMPRE devolvemos OK aunque el email no exista (anti-enumeration).
  const usuario = await prisma.usuario.findUnique({
    where: { email: raw },
    select: { id: true, activo: true, nombre: true, email: true },
  });
  if (!usuario || !usuario.activo) {
    return { ok: true };
  }

  // Invalidar tokens previos no usados de este usuario
  await prisma.passwordResetToken.updateMany({
    where: { usuarioId: usuario.id, usadoEn: null, expiraEn: { gt: new Date() } },
    data: { usadoEn: new Date() },
  });

  const { tokenPlano, tokenHash } = generarTokenReset();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await prisma.passwordResetToken.create({
    data: {
      usuarioId: usuario.id,
      tokenHash,
      expiraEn: expiraEnMinutos(RESET_TOKEN_TTL_MIN),
      ipSolicitud: ip,
    },
  });

  const baseUrl =
    process.env.APP_URL ?? h.get("origin") ?? `https://${h.get("host") ?? "tavex.fly.dev"}`;
  const resetUrl = buildResetUrl(baseUrl, tokenPlano);

  await sendEmail({
    to: usuario.email,
    subject: "Recuperá tu contraseña de Tavex",
    text: `Hola ${usuario.nombre},

Recibimos una solicitud para restablecer tu contraseña.
Abrí este enlace para elegir una nueva (vence en ${RESET_TOKEN_TTL_MIN} minutos):

${resetUrl}

Si no fuiste vos, podés ignorar este mensaje.

— Equipo Tavex`,
    html: `<!doctype html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
  <h2 style="margin:0 0 16px">Recuperá tu contraseña</h2>
  <p>Hola <strong>${escapeHtml(usuario.nombre)}</strong>,</p>
  <p>Recibimos una solicitud para restablecer tu contraseña. Hacé click en el botón para elegir una nueva (el enlace vence en <strong>${RESET_TOKEN_TTL_MIN} minutos</strong>):</p>
  <p style="margin:24px 0"><a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;font-weight:600;text-decoration:none">Restablecer contraseña</a></p>
  <p style="font-size:12px;color:#666">Si el botón no funciona, copiá este enlace: <br><code style="word-break:break-all">${resetUrl}</code></p>
  <p style="font-size:12px;color:#666;margin-top:24px">Si no fuiste vos, podés ignorar este mensaje — nadie verá tu contraseña actual.</p>
  <hr style="border:0;border-top:1px solid #eee;margin:24px 0">
  <p style="font-size:11px;color:#999">Tavex · Sistema Marangatu · Paraguay</p>
</body></html>`,
  });

  return { ok: true };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}
