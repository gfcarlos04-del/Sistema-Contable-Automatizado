"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptString } from "@/lib/crypto";

const CLAVE_GEMINI = "gemini.api_key";

const schema = z.object({
  apiKey: z.string().trim().min(10, "API Key demasiado corta"),
});

export type GuardarResult = { ok: true } | { ok: false; error: string };

export async function guardarApiKeyGeminiAction(formData: FormData): Promise<GuardarResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "No autenticado." };
  if (session.user.rol !== "ADMIN") {
    return { ok: false, error: "Solo el Admin puede modificar la configuración." };
  }

  const parsed = schema.safeParse({ apiKey: formData.get("apiKey") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" };
  }

  // Prisma `Bytes` espera Uint8Array; en Node 22 Buffer.buffer es ArrayBufferLike
  // (incluye SharedArrayBuffer) y TS no acepta la asignación directa.
  const cifrado = new Uint8Array(encryptString(parsed.data.apiKey));

  await prisma.configuracionOrg.upsert({
    where: {
      organizacionId_clave: {
        organizacionId: session.user.organizacionId,
        clave: CLAVE_GEMINI,
      },
    },
    update: {
      valorCifrado: cifrado,
      valor: null,
      actualizadoPorId: session.user.id,
    },
    create: {
      organizacionId: session.user.organizacionId,
      clave: CLAVE_GEMINI,
      valorCifrado: cifrado,
      actualizadoPorId: session.user.id,
    },
  });

  revalidatePath("/app/configuracion");
  return { ok: true };
}

export async function existeApiKeyGemini(organizacionId: string): Promise<boolean> {
  const row = await prisma.configuracionOrg.findUnique({
    where: { organizacionId_clave: { organizacionId, clave: CLAVE_GEMINI } },
    select: { id: true, valorCifrado: true },
  });
  return !!row?.valorCifrado;
}
