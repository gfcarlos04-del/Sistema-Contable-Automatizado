"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function cambiarPassword(
  passwordActual: string,
  passwordNuevo: string,
  passwordConfirmar: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "No autenticado." };

  // Basic validations
  if (!passwordActual) return { ok: false, error: "La contraseña actual es obligatoria." };
  if (!passwordNuevo || passwordNuevo.length < 8) {
    return { ok: false, error: "La nueva contraseña debe tener al menos 8 caracteres." };
  }
  if (passwordNuevo !== passwordConfirmar) {
    return { ok: false, error: "Las contraseñas nuevas no coinciden." };
  }
  if (passwordActual === passwordNuevo) {
    return { ok: false, error: "La nueva contraseña debe ser diferente a la actual." };
  }

  // Fetch current hash
  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { hashPassword: true },
  });
  if (!usuario) return { ok: false, error: "Usuario no encontrado." };

  // Verify current password
  const esValida = await verifyPassword(passwordActual, usuario.hashPassword);
  if (!esValida) return { ok: false, error: "La contraseña actual es incorrecta." };

  // Hash and save new password
  const nuevoHash = await hashPassword(passwordNuevo);
  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { hashPassword: nuevoHash },
  });

  revalidatePath("/app/perfil");
  return { ok: true };
}
