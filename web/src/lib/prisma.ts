import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const instance = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = instance;
  }
  return instance;
}

/**
 * Cliente Prisma con instanciación **lazy** via Proxy.
 *
 * Por qué Proxy: Next.js 16 evalúa los module imports en build time (para
 * "Collect page data"). Si instanciáramos el cliente al cargar el módulo,
 * el build fallaría porque las DB credentials sólo existen en runtime
 * (Fly secrets, no build args). El Proxy difiere el `createPrismaClient`
 * hasta el primer acceso a una propiedad.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrisma(), prop, receiver);
  },
});
