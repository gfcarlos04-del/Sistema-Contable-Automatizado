// Worker BullMQ — F2: extracción real con Gemini.

import { Worker } from "bullmq";
import { config as loadEnv } from "dotenv";
import { COLAS, getRedisConnection } from "../lib/queue";
import { prisma } from "../lib/prisma";
import { getObject } from "../lib/storage";
import { getGeminiApiKey, extraerComprobante, mapDocType } from "../lib/gemini";
import { getEnv } from "../lib/env";
import * as PrismaTypes from "../generated/prisma/internal/prismaNamespace";

loadEnv({ path: ".env.local" });
loadEnv();

// ── Helpers ───────────────────────────────────────────────────────────────

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

// ── Job data type ─────────────────────────────────────────────────────────

interface JobData {
  archivoId: string;
  comprobanteId: string;
  organizacionId: string;
  clienteId: string;
}

// ── Worker ────────────────────────────────────────────────────────────────

const connection = getRedisConnection();

const worker = new Worker<JobData>(
  COLAS.EXTRACCION,
  async (job) => {
    const { archivoId, comprobanteId, organizacionId } = job.data;
    console.log(`[worker] procesando job ${job.id} — comprobante ${comprobanteId}`);

    try {
      // 1. Mark as extracting
      await prisma.comprobante.update({
        where: { id: comprobanteId },
        data: { estado: "EXTRAYENDO" },
      });

      // 2. Fetch archivo metadata
      const archivo = await prisma.archivo.findUnique({
        where: { id: archivoId },
        select: { ruta: true, mime: true },
      });
      if (!archivo) throw new Error(`Archivo ${archivoId} no encontrado en DB.`);

      // 3. Download file from R2
      const buffer = await getObject(archivo.ruta);

      // 4. Get API key
      const env = getEnv();
      const apiKey = await getGeminiApiKey(organizacionId);
      const modelo = env.GEMINI_MODEL;

      // 5. Call Gemini
      const response = await extraerComprobante({
        buffer,
        mime: archivo.mime,
        modelo,
        apiKey,
      });

      const f = response.fields;

      // 6. Map response to comprobante fields
      const rucRaw = f.ruc_emisor.value != null ? String(f.ruc_emisor.value) : null;
      // Remove DV if present (e.g. "80024627-1" → "80024627")
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
        tipoRegistro: 2, // COMPRAS default
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
        geminiRequestId: job.id ?? null,
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

      // 7. Build CampoExtraido records
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

      // 8. Update comprobante + create campos in transaction
      await prisma.$transaction([
        prisma.campoExtraido.deleteMany({ where: { comprobanteId } }),
        prisma.comprobante.update({
          where: { id: comprobanteId },
          data: comprobanteData,
        }),
        prisma.campoExtraido.createMany({ data: camposData }),
      ]);

      console.log(
        `[worker] job ${job.id} completado — estado: ${estadoFinal}, confianza: ${response.general_confidence}%`,
      );
      return { ok: true, estado: estadoFinal };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[worker] job ${job.id} falló:`, err);

      // Update estado to REQUIERE_REVISION_MANUAL on error
      await prisma.comprobante
        .update({
          where: { id: comprobanteId },
          data: { estado: "REQUIERE_REVISION_MANUAL" },
        })
        .catch((e) => console.error("[worker] error al actualizar estado en fallo:", e));

      throw new Error(msg);
    }
  },
  { connection },
);

worker.on("ready", () => {
  console.log(`[worker] ready, escuchando cola "${COLAS.EXTRACCION}"`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} falló:`, err.message);
});

async function shutdown() {
  console.log("[worker] cerrando…");
  await worker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
