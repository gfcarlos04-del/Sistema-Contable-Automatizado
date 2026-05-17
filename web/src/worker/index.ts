// Worker BullMQ — placeholder F0.
// En F2 procesa jobs reales de extracción Gemini. Por ahora sólo registra que el
// worker arrancó, comprueba conexión a Redis y escucha la cola de extracción.

import { Worker } from "bullmq";
import { config as loadEnv } from "dotenv";
import { COLAS, getRedisConnection } from "../lib/queue";

loadEnv({ path: ".env.local" });
loadEnv();

const connection = getRedisConnection();

const worker = new Worker(
  COLAS.EXTRACCION,
  async (job) => {
    // F2: aquí se llama a Gemini, se guardan campos extraídos, etc.
    console.log(`[worker] job recibido: ${job.id} (${job.name})`);
    return { ok: true, placeholder: true };
  },
  { connection },
);

worker.on("ready", () => {
  console.log(`[worker] ready, escuchando cola "${COLAS.EXTRACCION}"`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} falló:`, err);
});

process.on("SIGINT", async () => {
  console.log("[worker] cerrando…");
  await worker.close();
  await connection.quit();
  process.exit(0);
});
