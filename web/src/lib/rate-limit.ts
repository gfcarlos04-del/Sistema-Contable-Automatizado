/**
 * Rate limiter genérico — sliding window simple por minuto.
 *
 * - Si REDIS_URL está configurada: usa Redis (BullMQ client) para contar.
 * - Si no: usa Map en memoria del proceso (válido en single-instance Fly,
 *   se resetea en cada deploy; aceptable como fallback).
 *
 * Uso:
 *   const { allowed, remaining, resetAt } = await rateLimit({
 *     key: `upload:${userId}`,
 *     limit: 30,
 *     windowSec: 60,
 *   });
 *   if (!allowed) return new Response("rate limit", { status: 429 });
 */

import { Redis } from "ioredis";

let redisClient: Redis | null = null;
let redisInitTried = false;

function getRedis(): Redis | null {
  if (redisInitTried) return redisClient;
  redisInitTried = true;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redisClient.on("error", (err) => {
      console.warn("[rate-limit] Redis error:", err.message);
    });
    return redisClient;
  } catch (err) {
    console.warn(
      "[rate-limit] No se pudo inicializar Redis:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

// Fallback en memoria
const memCounters = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number; // epoch ms
  backend: "redis" | "memory";
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSec: number;
}

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowSec } = opts;
  const windowMs = windowSec * 1000;
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const resetAt = (bucket + 1) * windowMs;
  const fullKey = `rl:${key}:${bucket}`;

  const redis = getRedis();
  if (redis) {
    try {
      const count = await redis.incr(fullKey);
      if (count === 1) {
        // Expira al cerrar la ventana — sumamos 1 segundo de gracia
        await redis.expire(fullKey, windowSec + 1);
      }
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        limit,
        resetAt,
        backend: "redis",
      };
    } catch (err) {
      console.warn(
        "[rate-limit] Redis falló, fallback a memoria:",
        err instanceof Error ? err.message : err,
      );
      // Cae al fallback
    }
  }

  // Memoria
  const cached = memCounters.get(fullKey);
  if (!cached || cached.resetAt !== resetAt) {
    memCounters.set(fullKey, { count: 1, resetAt });
    // GC simple: si el Map crece mucho, limpiamos entradas vencidas
    if (memCounters.size > 1000) {
      for (const [k, v] of memCounters) {
        if (v.resetAt <= now) memCounters.delete(k);
      }
    }
    return { allowed: true, remaining: limit - 1, limit, resetAt, backend: "memory" };
  }
  cached.count++;
  return {
    allowed: cached.count <= limit,
    remaining: Math.max(0, limit - cached.count),
    limit,
    resetAt,
    backend: "memory",
  };
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.floor(r.resetAt / 1000)),
  };
}
