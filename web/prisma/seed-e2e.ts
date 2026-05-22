/**
 * Seed para tests E2E (Playwright).
 *
 * Crea de forma idempotente:
 *   - Organización "Tavex E2E"
 *   - Usuario admin con las credenciales que los E2E esperan
 *     (E2E_USER_EMAIL / E2E_USER_PASSWORD o defaults)
 *   - Cliente de prueba con régimen IVA + IRE (para que las
 *     imputaciones de los tests no fallen por V-016)
 *
 * Defensivo: aborta si DATABASE_URL parece producción.
 *
 * Uso:
 *   npm run db:seed:e2e
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: ".env.test.local" });
loadEnv({ path: ".env.local" });
loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL no está configurada.");
  process.exit(1);
}

// Defensa: rechazar bases con nombres sospechosos de producción.
const PROD_HINTS = ["prod", "production", "live"];
const urlLower = DATABASE_URL.toLowerCase();
if (PROD_HINTS.some((h) => urlLower.includes(h))) {
  console.error(`❌ DATABASE_URL parece apuntar a producción (${urlLower}). Abortando seed E2E.`);
  console.error("   Usá una DB de test o exportá ALLOW_E2E_SEED_IN_PROD=1 (no recomendado).");
  if (process.env.ALLOW_E2E_SEED_IN_PROD !== "1") {
    process.exit(1);
  }
}

const EMAIL = (process.env.E2E_USER_EMAIL ?? "test@tavex.test").toLowerCase();
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "test1234567";
const ORG_SLUG = "tavex-e2e";
const ORG_NOMBRE = "Tavex E2E";
const CLIENTE_RUC = "80012345";
const CLIENTE_DV = 0;
const CLIENTE_RAZON = "Cliente E2E S.A.";

async function main() {
  const dbUrl = DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString: dbUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log(`🌱 Seed E2E — DB: ${dbUrl.split("@")[1] ?? "(oculto)"}`);

    // 1. Organización
    const org = await prisma.organizacion.upsert({
      where: { slug: ORG_SLUG },
      update: { nombre: ORG_NOMBRE, activo: true },
      create: { slug: ORG_SLUG, nombre: ORG_NOMBRE, plan: "free", activo: true },
    });
    console.log(`✅ Organización: ${org.nombre} (${org.id})`);

    // 2. Usuario admin
    const hashPwd = await bcrypt.hash(PASSWORD, 12);
    const usuario = await prisma.usuario.upsert({
      where: { email: EMAIL },
      update: {
        hashPassword: hashPwd,
        nombre: "Test Admin",
        rol: "ADMIN",
        activo: true,
        organizacionId: org.id,
      },
      create: {
        email: EMAIL,
        hashPassword: hashPwd,
        nombre: "Test Admin",
        rol: "ADMIN",
        activo: true,
        organizacionId: org.id,
      },
    });
    console.log(`✅ Usuario: ${usuario.email} (rol=${usuario.rol})`);

    // 3. Cliente con régimen completo
    const cliente = await prisma.cliente.upsert({
      where: { organizacionId_ruc: { organizacionId: org.id, ruc: CLIENTE_RUC } },
      update: {
        razonSocial: CLIENTE_RAZON,
        dv: CLIENTE_DV,
        regimen: ["IVA", "IRE", "IRP_RSP"],
        activo: true,
      },
      create: {
        organizacionId: org.id,
        ruc: CLIENTE_RUC,
        dv: CLIENTE_DV,
        razonSocial: CLIENTE_RAZON,
        regimen: ["IVA", "IRE", "IRP_RSP"],
        activo: true,
      },
    });
    console.log(`✅ Cliente: ${cliente.razonSocial} (${cliente.ruc}-${cliente.dv})`);

    console.log("");
    console.log("🎉 Seed E2E completo. Credenciales:");
    console.log(`   Email:    ${EMAIL}`);
    console.log(`   Password: ${PASSWORD}`);
    console.log("");
    console.log("Ahora podés correr:  npm run test:e2e");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Seed E2E falló:", err);
  process.exit(1);
});
