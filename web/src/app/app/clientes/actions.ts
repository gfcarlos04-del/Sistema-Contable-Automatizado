"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { parseRuc } from "@/lib/ruc";
import type { Regimen } from "@/generated/prisma/enums";

// ───────────────────────────────────────────────────────────────────────────
// Schemas
// ───────────────────────────────────────────────────────────────────────────

const REGIMENES_VALIDOS = ["IVA", "IRE", "IRE_SIMPLE", "IRP_RSP"] as const;

const clienteSchema = z.object({
  razonSocial: z.string().trim().min(2).max(200),
  ruc: z.string().trim().min(1).max(20), // se valida con parseRuc
  regimen: z.array(z.enum(REGIMENES_VALIDOS)).min(1, "Marcá al menos un régimen tributario"),
});

export type FormState = { ok: true } | { ok: false; error: string } | null;

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return { error: "No autenticado." as const, session: null };
  }
  if (session.user.rol !== "ADMIN") {
    return { error: "Solo el Admin puede gestionar clientes." as const, session: null };
  }
  return { error: null, session };
}

function parseFormCliente(formData: FormData) {
  const regimen = formData.getAll("regimen").map((v) => String(v));
  return clienteSchema.safeParse({
    razonSocial: formData.get("razonSocial"),
    ruc: formData.get("ruc"),
    regimen,
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Crear
// ───────────────────────────────────────────────────────────────────────────

export async function crearClienteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { error, session } = await requireAdmin();
  if (error) return { ok: false, error };

  const parsed = parseFormCliente(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  let rucParsed;
  try {
    rucParsed = parseRuc(parsed.data.ruc);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "RUC inválido.",
    };
  }

  try {
    await prisma.cliente.create({
      data: {
        organizacionId: session.user.organizacionId,
        razonSocial: parsed.data.razonSocial,
        ruc: rucParsed.ruc,
        dv: rucParsed.dv,
        regimen: parsed.data.regimen as Regimen[],
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: `Ya existe un cliente con RUC ${rucParsed.formatoCanonico} en esta organización.`,
      };
    }
    console.error("crearCliente", err);
    return { ok: false, error: "No se pudo crear el cliente." };
  }

  revalidatePath("/app/clientes");
  revalidatePath("/app");
  redirect("/app/clientes");
}

// ───────────────────────────────────────────────────────────────────────────
// Editar
// ───────────────────────────────────────────────────────────────────────────

export async function editarClienteAction(
  clienteId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { error, session } = await requireAdmin();
  if (error) return { ok: false, error };

  const parsed = parseFormCliente(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  let rucParsed;
  try {
    rucParsed = parseRuc(parsed.data.ruc);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "RUC inválido.",
    };
  }

  // Verificar que el cliente pertenece a la organización (defensa en profundidad).
  const existente = await prisma.cliente.findFirst({
    where: { id: clienteId, organizacionId: session.user.organizacionId },
    select: { id: true },
  });
  if (!existente) return { ok: false, error: "Cliente no encontrado." };

  try {
    await prisma.cliente.update({
      where: { id: clienteId },
      data: {
        razonSocial: parsed.data.razonSocial,
        ruc: rucParsed.ruc,
        dv: rucParsed.dv,
        regimen: parsed.data.regimen as Regimen[],
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: `Otro cliente de la organización ya usa el RUC ${rucParsed.formatoCanonico}.`,
      };
    }
    console.error("editarCliente", err);
    return { ok: false, error: "No se pudo guardar el cliente." };
  }

  revalidatePath("/app/clientes");
  revalidatePath(`/app/clientes/${clienteId}`);
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────────────────
// Baja lógica / reactivar
// ───────────────────────────────────────────────────────────────────────────

export async function toggleActivoClienteAction(clienteId: string): Promise<FormState> {
  const { error, session } = await requireAdmin();
  if (error) return { ok: false, error };

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, organizacionId: session.user.organizacionId },
    select: { id: true, activo: true },
  });
  if (!cliente) return { ok: false, error: "Cliente no encontrado." };

  await prisma.cliente.update({
    where: { id: clienteId },
    data: { activo: !cliente.activo },
  });

  revalidatePath("/app/clientes");
  revalidatePath(`/app/clientes/${clienteId}`);
  revalidatePath("/app");
  return { ok: true };
}
