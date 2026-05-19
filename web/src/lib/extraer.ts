// Lógica de extracción Gemini compartida entre el worker BullMQ y la API de extracción directa.
// Esto permite extraer sin Redis cuando el usuario lo dispara manualmente desde la UI.

import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage";
import { getGeminiApiKey, extraerComprobante, mapDocType } from "@/lib/gemini";
import { getEnv } from "@/lib/env";
import * as PrismaTypes from "@/generated/prisma/internal/prismaNamespace";

// ── Helpers (duplicados desde worker para evitar import de proceso Node) ──────

function normalizeNumero(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).replace(/\D/g, "");
  if (s.length < 13) return String(v);
  return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6, 13)}`;
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch)
    return new Date(
      `${dmyMatch[3]}-${dmyMatch[2]!.padStart(2, "0")}-${dmyMatch[1]!.padStart(2, "0")}`,
    );
  const isoMatch = s.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) return new Date(s);
  return null;
}

function toInt(v: unknown): number {
  if (v == null) return 0;
  const n = parseInt(String(v).replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

// ── Resultado ─────────────────────────────────────────────────────────────────

export interface ResultadoExtraccion {
  ok: true;
  estado: "EXTRAIDO" | "REQUIERE_REVISION_MANUAL";
  confianzaGeneral: number;
}

// ── procesarExtraccion ────────────────────────────────────────────────────────

/**
 * Ejecuta la extracción Gemini sobre un comprobante de forma síncrona.
 * Usado tanto por el worker BullMQ como por la API de extracción directa.
 *
 * Lanza un Error si algo falla; el caller decide cómo manejarlo.
 */
export async function procesarExtraccion(params: {
  comprobanteId: string;
  archivoId: string;
  organizacionId: string;
  requestId?: string;
}): Promise<ResultadoExtraccion> {
  const { comprobanteId, archivoId, organizacionId, requestId } = params;

  // 1. Marcar como EXTRAYENDO
  await prisma.comprobante.update({
    where: { id: comprobanteId },
    data: { estado: "EXTRAYENDO" },
  });

  // 2. Obtener metadatos del archivo
  const archivo = await prisma.archivo.findUnique({
    where: { id: archivoId },
    select: { ruta: true, mime: true },
  });
  if (!archivo) throw new Error(`Archivo ${archivoId} no encontrado.`);

  // 3. Descargar desde R2
  const buffer = await getObject(archivo.ruta);

  // 4. API key
  const env = getEnv();
  const apiKey = await getGeminiApiKey(organizacionId);
  const modelo = env.GEMINI_MODEL;

  // 5. Llamar a Gemini
  const response = await extraerComprobante({ buffer, mime: archivo.mime, modelo, apiKey });
  const f = response.fields;

  // 6. Mapear respuesta a campos
  const rucRaw = f.ruc_emisor.value != null ? String(f.ruc_emisor.value) : null;
  const rucContraparte = rucRaw ? rucRaw.replace(/-\d$/, "").replace(/\D/g, "") : null;
  const dvRaw = f.dv_emisor.value != null ? String(f.dv_emisor.value) : null;
  const dvContraparte = dvRaw != null ? parseInt(dvRaw, 10) : null;

  const gravado10 = toInt(f.monto_gravado_10_iva_incluido.value);
  const iva10Extracted = toInt(f.iva_10.value);
  const iva10 = iva10Extracted > 0 ? iva10Extracted : Math.round(gravado10 / 11);

  const gravado5 = toInt(f.monto_gravado_5_iva_incluido.value);
  const iva5Extracted = toInt(f.iva_5.value);
  const iva5 = iva5Extracted > 0 ? iva5Extracted : Math.round(gravado5 / 21);

  const condVal = f.condicion_operacion.value;
  const condicionOperacion = condVal === "CONTADO" ? 1 : condVal === "CREDITO" ? 2 : 1;

  const estadoFinal: "EXTRAIDO" | "REQUIERE_REVISION_MANUAL" =
    response.general_confidence >= 70 && !response.requires_manual_review
      ? "EXTRAIDO"
      : "REQUIERE_REVISION_MANUAL";

  const comprobanteData = {
    tipoComprobante: mapDocType(response.document_type),
    tipoRegistro: 2, // COMPRAS default — el usuario ajusta en revisión
    rucContraparte,
    dvContraparte: isNaN(dvContraparte ?? NaN) ? null : dvContraparte,
    nombreContraparte: f.nombre_emisor.value != null ? String(f.nombre_emisor.value) : null,
    tipoIdentificacionContraparte: 11, // RUC default
    timbrado: f.timbrado.value != null ? String(f.timbrado.value) : null,
    numero: normalizeNumero(f.numero_comprobante.value),
    fechaEmision: parseDate(f.fecha_emision.value),
    montoGravado10: gravado10,
    iva10,
    montoGravado5: gravado5,
    iva5,
    exento: toInt(f.exento.value),
    total: toInt(f.total.value),
    condicionOperacion,
    moneda: f.moneda.value != null ? String(f.moneda.value) : "PYG",
    confianzaGeneral: response.general_confidence,
    geminiModelo: modelo,
    geminiRequestId: requestId ?? null,
    estado: estadoFinal,
    comprobanteAsociadoNumero:
      f.comprobante_asociado_numero.value != null
        ? String(f.comprobante_asociado_numero.value)
        : null,
    comprobanteAsociadoTimbrado:
      f.comprobante_asociado_timbrado.value != null
        ? String(f.comprobante_asociado_timbrado.value)
        : null,
  };

  const camposData = Object.entries(f).map(([campo, fieldData]) => ({
    comprobanteId,
    campo,
    valorExtraido: fieldData.value != null ? String(fieldData.value) : null,
    valorFinal: fieldData.value != null ? String(fieldData.value) : null,
    confianza: fieldData.confidence,
    status: fieldData.status,
    observacion: fieldData.observation ?? null,
    ubicacionBbox: fieldData.bbox ?? PrismaTypes.NullableJsonNullValueInput.DbNull,
  }));

  // 7. Actualizar en DB
  await prisma.$transaction([
    prisma.campoExtraido.deleteMany({ where: { comprobanteId } }),
    prisma.comprobante.update({ where: { id: comprobanteId }, data: comprobanteData }),
    prisma.campoExtraido.createMany({ data: camposData }),
  ]);

  return { ok: true, estado: estadoFinal, confianzaGeneral: response.general_confidence };
}
