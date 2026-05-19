"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { validarComprobante, type ErrorValidacion } from "@/lib/validar";
import { getQueue, COLAS } from "@/lib/queue";
import { procesarExtraccion } from "@/lib/extraer";

// ── Types ─────────────────────────────────────────────────────────────────

export interface FormData {
  tipoRegistro: number;
  tipoComprobante: number;
  fechaEmision: string; // YYYY-MM-DD
  timbrado: string;
  numero: string;
  rucContraparte: string;
  dvContraparte: number;
  nombreContraparte: string;
  tipoIdentificacionContraparte: number;
  montoGravado10: number;
  iva10: number;
  montoGravado5: number;
  iva5: number;
  exento: number;
  total: number;
  condicionOperacion: number;
  imputaIva: "S" | "N";
  imputaIre: "S" | "N";
  imputaIrpRsp: "S" | "N";
  noImputa: "S" | "N";
  comprobanteAsociadoNumero?: string;
  comprobanteAsociadoTimbrado?: string;
}

export type ActionResult = { ok: boolean; errors?: ErrorValidacion[]; usoCola?: boolean };

// ── Helpers ───────────────────────────────────────────────────────────────

async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

async function getComprobanteOwned(comprobanteId: string, organizacionId: string) {
  const c = await prisma.comprobante.findFirst({
    where: { id: comprobanteId, organizacionId },
    include: {
      campos: { select: { campo: true, confianza: true, status: true } },
    },
  });
  return c;
}

// ── guardarCampos ─────────────────────────────────────────────────────────

export async function guardarCampos(comprobanteId: string, data: FormData): Promise<ActionResult> {
  const session = await requireSession();

  const existing = await getComprobanteOwned(comprobanteId, session.user.organizacionId);
  if (!existing)
    return { ok: false, errors: [{ codigo: "AUTH", mensaje: "No encontrado", severidad: "BLOQ" }] };

  const fechaEmision = data.fechaEmision ? new Date(data.fechaEmision) : null;

  // Build changed fields for audit
  const updates: Record<string, unknown> = {
    tipoRegistro: data.tipoRegistro,
    tipoComprobante: data.tipoComprobante,
    fechaEmision,
    timbrado: data.timbrado || null,
    numero: data.numero || null,
    rucContraparte: data.rucContraparte || null,
    dvContraparte: isNaN(data.dvContraparte) ? null : data.dvContraparte,
    nombreContraparte: data.nombreContraparte || null,
    tipoIdentificacionContraparte: data.tipoIdentificacionContraparte,
    montoGravado10: data.montoGravado10,
    iva10: data.iva10,
    montoGravado5: data.montoGravado5,
    iva5: data.iva5,
    exento: data.exento,
    total: data.total,
    condicionOperacion: data.condicionOperacion,
    imputaIva: data.imputaIva,
    imputaIre: data.imputaIre,
    imputaIrpRsp: data.imputaIrpRsp,
    noImputa: data.noImputa,
    comprobanteAsociadoNumero: data.comprobanteAsociadoNumero || null,
    comprobanteAsociadoTimbrado: data.comprobanteAsociadoTimbrado || null,
    estado: "EN_REVISION" as const,
  };

  // Collect audit records for changed fields
  const auditEntries: {
    organizacionId: string;
    entidad: string;
    idEntidad: string;
    campo: string;
    valorAnterior: string | null;
    valorNuevo: string | null;
    usuarioId: string;
  }[] = [];

  for (const [campo, valorNuevo] of Object.entries(updates)) {
    if (campo === "estado") continue;
    const valorAnterior = (existing as Record<string, unknown>)[campo];
    const anteriorStr = valorAnterior != null ? String(valorAnterior) : null;
    const nuevoStr = valorNuevo != null ? String(valorNuevo) : null;
    if (anteriorStr !== nuevoStr) {
      auditEntries.push({
        organizacionId: session.user.organizacionId,
        entidad: "comprobante",
        idEntidad: comprobanteId,
        campo,
        valorAnterior: anteriorStr,
        valorNuevo: nuevoStr,
        usuarioId: session.user.id,
      });
    }
  }

  await prisma.$transaction([
    prisma.comprobante.update({
      where: { id: comprobanteId },
      data: updates,
    }),
    ...(auditEntries.length > 0 ? [prisma.auditoriaCambio.createMany({ data: auditEntries })] : []),
  ]);

  return { ok: true };
}

// ── aprobarComprobante ────────────────────────────────────────────────────

export async function aprobarComprobante(comprobanteId: string): Promise<ActionResult> {
  const session = await requireSession();

  const comprobante = await getComprobanteOwned(comprobanteId, session.user.organizacionId);
  if (!comprobante)
    return { ok: false, errors: [{ codigo: "AUTH", mensaje: "No encontrado", severidad: "BLOQ" }] };

  // Run validations as if estado = REGISTRADO
  const errors = validarComprobante({
    tipoRegistro: comprobante.tipoRegistro,
    tipoComprobante: comprobante.tipoComprobante,
    fechaEmision: comprobante.fechaEmision,
    timbrado: comprobante.timbrado,
    numero: comprobante.numero,
    rucContraparte: comprobante.rucContraparte,
    dvContraparte: comprobante.dvContraparte,
    montoGravado10: comprobante.montoGravado10 as unknown as number,
    iva10: comprobante.iva10 as unknown as number,
    montoGravado5: comprobante.montoGravado5 as unknown as number,
    iva5: comprobante.iva5 as unknown as number,
    exento: comprobante.exento as unknown as number,
    total: comprobante.total as unknown as number,
    imputaIva: comprobante.imputaIva,
    imputaIre: comprobante.imputaIre,
    imputaIrpRsp: comprobante.imputaIrpRsp,
    noImputa: comprobante.noImputa,
    estado: "REGISTRADO",
    campos: comprobante.campos,
  });

  const bloqueantes = errors.filter((e) => e.severidad === "BLOQ");
  if (bloqueantes.length > 0) {
    return { ok: false, errors: bloqueantes };
  }

  const ahora = new Date();
  await prisma.comprobante.update({
    where: { id: comprobanteId },
    data: {
      estado: "REGISTRADO",
      aprobadoPorId: session.user.id,
      aprobadoEn: ahora,
      registradoEn: ahora,
    },
  });

  return { ok: true };
}

// ── rechazarComprobante ───────────────────────────────────────────────────

export async function rechazarComprobante(
  comprobanteId: string,
  motivo: string,
): Promise<ActionResult> {
  const session = await requireSession();

  const comprobante = await getComprobanteOwned(comprobanteId, session.user.organizacionId);
  if (!comprobante)
    return { ok: false, errors: [{ codigo: "AUTH", mensaje: "No encontrado", severidad: "BLOQ" }] };

  await prisma.$transaction([
    prisma.comprobante.update({
      where: { id: comprobanteId },
      data: { estado: "RECHAZADO" },
    }),
    prisma.auditoriaCambio.create({
      data: {
        organizacionId: session.user.organizacionId,
        entidad: "comprobante",
        idEntidad: comprobanteId,
        campo: "estado",
        valorAnterior: comprobante.estado,
        valorNuevo: "RECHAZADO",
        usuarioId: session.user.id,
        ...(motivo ? { motivo } : {}),
      },
    }),
  ]);

  return { ok: true };
}

// ── reextraerComprobante ──────────────────────────────────────────────────

export async function reextraerComprobante(comprobanteId: string): Promise<ActionResult> {
  const session = await requireSession();

  const comprobante = await prisma.comprobante.findFirst({
    where: { id: comprobanteId, organizacionId: session.user.organizacionId },
    select: { id: true, archivoId: true, clienteId: true, organizacionId: true },
  });
  if (!comprobante)
    return { ok: false, errors: [{ codigo: "AUTH", mensaje: "No encontrado", severidad: "BLOQ" }] };
  if (!comprobante.archivoId) {
    return {
      ok: false,
      errors: [
        {
          codigo: "NO_ARCHIVO",
          mensaje: "No hay archivo adjunto para re-extraer.",
          severidad: "BLOQ",
        },
      ],
    };
  }

  // Reset state and clear campos
  await prisma.$transaction([
    prisma.campoExtraido.deleteMany({ where: { comprobanteId } }),
    prisma.comprobante.update({
      where: { id: comprobanteId },
      data: {
        estado: "CARGADO",
        tipoComprobante: 0,
        tipoRegistro: 0,
        confianzaGeneral: null,
        geminiModelo: null,
        geminiRequestId: null,
      },
    }),
  ]);

  // Intentar encolar en Redis; si no está configurado, extraer directamente (síncrono).
  let usoCola = false;
  try {
    const queue = getQueue(COLAS.EXTRACCION);
    await queue.add("extraer", {
      archivoId: comprobante.archivoId,
      comprobanteId,
      organizacionId: comprobante.organizacionId,
      clienteId: comprobante.clienteId,
    });
    usoCola = true;
  } catch {
    // Redis no configurado — extraer directamente (puede tardar ~20s)
  }

  if (!usoCola) {
    try {
      await procesarExtraccion({
        comprobanteId,
        archivoId: comprobante.archivoId,
        organizacionId: comprobante.organizacionId,
        requestId: `direct-reextract-${Date.now()}`,
      });
    } catch (err) {
      await prisma.comprobante
        .update({ where: { id: comprobanteId }, data: { estado: "REQUIERE_REVISION_MANUAL" } })
        .catch(() => {});
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        errors: [{ codigo: "GEMINI_ERR", mensaje: `Error Gemini: ${msg}`, severidad: "BLOQ" as const }],
      };
    }
  }

  return { ok: true, usoCola };
}
