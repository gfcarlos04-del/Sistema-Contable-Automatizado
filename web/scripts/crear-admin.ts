// Script one-shot: crea organización + usuario admin en la DB de producción.
// Uso: npx tsx scripts/crear-admin.ts

import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

loadEnv({ path: ".env.local" });
loadEnv();

// Prisma 7 con adapter-pg (igual que lib/prisma.ts)
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@tavex.app";
  const password = "Tavex2026!";
  const nombre = "Administrador";
  const orgNombre = "Tavex Demo";
  const orgSlug = "tavex-demo";

  // Verificar si ya existe
  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) {
    console.log(`✓ Usuario ya existe: ${email}`);
    return;
  }

  const hash = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organizacion.create({
      data: { nombre: orgNombre, slug: orgSlug },
    });

    const usuario = await tx.usuario.create({
      data: {
        organizacionId: org.id,
        email,
        hashPassword: hash,
        nombre,
        rol: "ADMIN",
      },
    });

    return { org, usuario };
  });

  console.log("✅ Cuenta creada:");
  console.log(`   Organización : ${result.org.nombre} (${result.org.slug})`);
  console.log(`   Email        : ${email}`);
  console.log(`   Contraseña   : ${password}`);
  console.log(`   Rol          : ADMIN`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
