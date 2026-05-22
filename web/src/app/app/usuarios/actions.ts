"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export type ActionResult = { ok: true } | { ok: false; error: string };

// ───────────────────────────────────────────────────────────────────────────
// Helper
// ───────────────────────────────────────────────────────────────────────────

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) return { error: "No autenticado." as const, session: null };
  if (session.user.rol !== "ADMIN")
    return { error: "Solo el Admin puede gestionar usuarios." as const, session: null };
  return { error: null, session };
}

// ───────────────────────────────────────────────────────────────────────────
// Crear usuario
// ───────────────────────────────────────────────────────────────────────────

export async function crearUsuario(data: {
  nombre: string;
  email: string;
  password: string;
  rol: "ADMIN" | "OPERADOR";
}): Promise<ActionResult> {
  const { error, session } = await requireAdminSession();
  if (error) return { ok: false, error };

  const nombre = data.nombre.trim();
  const email = data.email.trim().toLowerCase();
  const password = data.password;
  const rol = data.rol;

  if (!nombre || nombre.length < 2)
    return { ok: false, error: "El nombre debe tener al menos 2 caracteres." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Email inválido." };
  if (!password || password.length < 8)
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres." };
  if (rol !== "ADMIN" && rol !== "OPERADOR") return { ok: false, error: "Rol inválido." };

  const existente = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existente) return { ok: false, error: "Ya existe un usuario con ese email." };

  const hashPwd = await hashPassword(password);

  try {
    await prisma.usuario.create({
      data: {
        organizacionId: session.user.organizacionId,
        nombre,
        email,
        hashPassword: hashPwd,
        rol,
      },
    });
  } catch {
    return { ok: false, error: "No se pudo crear el usuario." };
  }

  revalidatePath("/app/usuarios");
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────────────
// Toggle activo
// ───────────────────────────────────────────────────────────────────────────

export async function toggleActivoUsuario(usuarioId: string): Promise<ActionResult> {
  const { error, session } = await requireAdminSession();
  if (error) return { ok: false, error };

  if (usuarioId === session.user.id) {
    return { ok: false, error: "No podés desactivarte a vos mismo." };
  }

  const usuario = await prisma.usuario.findFirst({
    where: { id: usuarioId, organizacionId: session.user.organizacionId },
    select: { id: true, activo: true },
  });
  if (!usuario) return { ok: false, error: "Usuario no encontrado." };

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { activo: !usuario.activo },
  });

  revalidatePath("/app/usuarios");
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────────────
// Cambiar rol
// ───────────────────────────────────────────────────────────────────────────

export async function cambiarRolUsuario(
  usuarioId: string,
  nuevoRol: "ADMIN" | "OPERADOR",
): Promise<ActionResult> {
  const { error, session } = await requireAdminSession();
  if (error) return { ok: false, error };

  if (usuarioId === session.user.id) {
    return { ok: false, error: "No podés cambiar tu propio rol." };
  }

  const usuario = await prisma.usuario.findFirst({
    where: { id: usuarioId, organizacionId: session.user.organizacionId },
    select: { id: true },
  });
  if (!usuario) return { ok: false, error: "Usuario no encontrado." };

  if (nuevoRol !== "ADMIN" && nuevoRol !== "OPERADOR") {
    return { ok: false, error: "Rol inválido." };
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { rol: nuevoRol },
  });

  revalidatePath("/app/usuarios");
  return { ok: true };
}
