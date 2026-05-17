// Conexión Redis y definición de colas BullMQ.
// En F0 sólo definimos los nombres y un helper para encolar. El worker real
// vive en src/worker/index.ts y se ejecuta como proceso separado (`npm run worker`).

import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

export const COLAS = {
  EXTRACCION: "extraccion-gemini",
} as const;

export type NombreCola = (typeof COLAS)[keyof typeof COLAS];

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (connection) return connection;
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL no configurada. Definila para usar colas BullMQ.");
  }
  connection = new IORedis(url, {
    maxRetriesPerRequest: null, // requerido por BullMQ
    enableReadyCheck: false,
  });
  return connection;
}

const queues = new Map<string, Queue>();

export function getQueue(name: NombreCola): Queue {
  const cached = queues.get(name);
  if (cached) return cached;
  const q = new Queue(name, {
    connection: getRedisConnection() as unknown as ConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 24 * 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });
  queues.set(name, q);
  return q;
}
