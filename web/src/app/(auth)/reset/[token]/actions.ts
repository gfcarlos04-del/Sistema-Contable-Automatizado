"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { hashearToken } from "@/lib/reset-password";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function resetearPassword(
  tokenPlano: string,
  passwordNuevo: string,
  passwordConfirmar: string,
): Promise<ActionResult> {
  if (!tokenPlano) return { ok: false, error: "Token inválido." };
  if (!passwordNuevo || passwordNuevo.length < 8) {
    return { ok: false, error: "La nueva contraseña debe tener al menos 8 caracteres." };
  }
  if (passwordNuevo !== passwordConfirmar) {
    return { ok: false, error: "Las contraseñas no coinciden." };
  }

  const tokenHash = hashearToken(tokenPlano);
  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, usuarioId: true, expiraEn: true, usadoEn: true },
  });

  if (!token) return { ok: false, error: "El enlace no es válido." };
  if (token.usadoEn) return { ok: false, error: "Este enlace ya fue usado." };
  if (token.expiraEn < new Date()) {
    return { ok: false, error: "El enlace expiró. Solicitá uno nuevo." };
  }

  const hashedNuevo = await hashPassword(passwordNuevo);

  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: token.usuarioId },
      data: { hashPassword: hashedNuevo },
    }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usadoEn: new Date() },
    }),
    // Invalida cualquier otro token activo para este usuario
    prisma.passwordResetToken.updateMany({
      where: { usuarioId: token.usuarioId, usadoEn: null },
      data: { usadoEn: new Date() },
    }),
  ]);

  return { ok: true };
}

export async function validarToken(
  tokenPlano: string,
): Promise<{ valido: boolean; razon?: string }> {
  if (!tokenPlano) return { valido: false, razon: "Token vacío" };
  const tokenHash = hashearToken(tokenPlano);
  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { expiraEn: true, usadoEn: true },
  });
  if (!token) return { valido: false, razon: "El enlace no es válido." };
  if (token.usadoEn) return { valido: false, razon: "Este enlace ya fue usado." };
  if (token.expiraEn < new Date())
    return { valido: false, razon: "El enlace expiró. Solicitá uno nuevo." };
  return { valido: true };
}
