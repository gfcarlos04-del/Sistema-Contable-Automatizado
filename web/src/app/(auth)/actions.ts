"use server";

import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signIn } from "@/auth";

const signupSchema = z.object({
  organizacion: z.string().trim().min(2).max(120),
  nombre: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export type SignupResult = { ok: true } | { ok: false; error: string };

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function signupAction(formData: FormData): Promise<SignupResult> {
  const parsed = signupSchema.safeParse({
    organizacion: formData.get("organizacion"),
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos. Revisá los campos." };
  }

  const { organizacion, nombre, email, password } = parsed.data;
  const baseSlug = slugify(organizacion) || "org";

  try {
    await prisma.$transaction(async (tx) => {
      // Slug único: si choca, agrega sufijo numérico.
      let slug = baseSlug;
      let i = 0;
      // Hasta 20 intentos antes de rendirse.
      while (await tx.organizacion.findUnique({ where: { slug } })) {
        i += 1;
        if (i > 20) throw new Error("slug-exhausted");
        slug = `${baseSlug}-${i}`;
      }

      const org = await tx.organizacion.create({
        data: { nombre: organizacion, slug },
      });

      const hash = await hashPassword(password);
      await tx.usuario.create({
        data: {
          organizacionId: org.id,
          email,
          hashPassword: hash,
          nombre,
          rol: "ADMIN",
        },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "Ya existe un usuario con ese email." };
    }
    console.error("signup error", err);
    return { ok: false, error: "No se pudo crear la cuenta. Intentá de nuevo." };
  }

  // Auto-login
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/app",
  });

  return { ok: true };
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: "Credenciales inválidas." };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/app",
    });
    return { ok: true };
  } catch (err) {
    // NextAuth lanza redirect interno cuando es OK; sólo capturamos errores reales.
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    return { ok: false, error: "Email o contraseña incorrectos." };
  }
}
