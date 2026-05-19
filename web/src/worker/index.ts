// Worker BullMQ — extracción Gemini usando lib/extraer.ts compartida.

import { Worker } from "bullmq";
import { config as loadEnv } from "dotenv";
import { COLAS, getRedisConnection } from "../lib/queue";
import { prisma } from "../lib/prisma";
import { procesarExtraccion } from "../lib/extraer";

loadEnv({ path: ".env.local" });
loadEnv();

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
      const resultado = await procesarExtraccion({
        comprobanteId,
        archivoId,
        organizacionId,
        requestId: job.id ?? undefined,
      });
      console.log(
        `[worker] job ${job.id} completado — estado: ${resultado.estado}, confianza: ${resultado.confianzaGeneral}%`,
      );
      return resultado;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[worker] job ${job.id} falló:`, err);

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
