// Seed de catálogos SET (Especificación Técnica junio/2021).
// Reproducible: cada upsert usa la clave natural.

import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: ".env.local" });
loadEnv();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const VIGENTE_DESDE = new Date("2021-06-01");

// Tabla 1 — Tipos de registro
const TIPOS_REGISTRO = [
  { codigo: 1, descripcion: "VENTAS" },
  { codigo: 2, descripcion: "COMPRAS" },
  { codigo: 3, descripcion: "INGRESOS" },
  { codigo: 4, descripcion: "EGRESOS" },
];

// Tabla 2 — Condición de operación
const CONDICIONES = [
  { codigo: 1, descripcion: "CONTADO" },
  { codigo: 2, descripcion: "CRÉDITO" },
];

// Tabla 3 — Tipo de identificación
const TIPOS_IDENTIFICACION = [
  { codigo: 11, descripcion: "RUC" },
  { codigo: 12, descripcion: "CÉDULA DE IDENTIDAD" },
  { codigo: 13, descripcion: "PASAPORTE" },
  { codigo: 14, descripcion: "CÉDULA EXTRANJERO" },
  { codigo: 15, descripcion: "SIN NOMBRE" },
  { codigo: 16, descripcion: "DIPLOMÁTICO" },
  { codigo: 17, descripcion: "IDENTIFICACIÓN TRIBUTARIA" },
];

// Tabla 4 — Tipos de comprobante.
// `tiposRegistroPermitidos` define en qué hojas (VENTAS/COMPRAS/INGRESOS/EGRESOS)
// puede aparecer este tipo de comprobante.
// `requiereTimbrado`, `requiereNumero`, `permiteGravado` codifican excepciones de la
// Especificación Técnica.
const TIPOS_COMPROBANTE = [
  {
    codigo: 101,
    descripcion: "AUTOFACTURA",
    tiposRegistroPermitidos: [2],
    permiteGravado: false,
    notas: "COMPRAS: solo total, sin desagregado gravado.",
  },
  {
    codigo: 102,
    descripcion: "BOLETA DE TRANSPORTE PÚBLICO DE PASAJEROS",
    tiposRegistroPermitidos: [1, 2],
  },
  { codigo: 103, descripcion: "BOLETA DE VENTA", tiposRegistroPermitidos: [1, 2] },
  {
    codigo: 104,
    descripcion: "BOLETA RESIMPLE",
    tiposRegistroPermitidos: [2],
    permiteGravado: false,
    notas: "COMPRAS: solo total.",
  },
  {
    codigo: 105,
    descripcion: "BOLETOS DE LOTERÍAS, JUEGOS DE AZAR",
    tiposRegistroPermitidos: [1, 2],
    permiteGravado: false,
    notas: "En COMPRAS solo total.",
  },
  {
    codigo: 106,
    descripcion: "BOLETO O TICKET DE TRANSPORTE AÉREO",
    tiposRegistroPermitidos: [1, 2],
    requiereNumero: false,
  },
  {
    codigo: 107,
    descripcion: "DESPACHO DE IMPORTACIÓN",
    tiposRegistroPermitidos: [2],
    requiereTimbrado: false,
    notas: "Timbrado va en 0.",
  },
  { codigo: 108, descripcion: "ENTRADA A ESPECTÁCULOS PÚBLICOS", tiposRegistroPermitidos: [1, 2] },
  {
    codigo: 109,
    descripcion: "FACTURA",
    tiposRegistroPermitidos: [1, 2],
    notas: "Único tipo que exige condición de venta.",
  },
  {
    codigo: 110,
    descripcion: "NOTA DE CRÉDITO",
    tiposRegistroPermitidos: [1, 2],
    notas: "Exige comprobante asociado.",
  },
  {
    codigo: 111,
    descripcion: "NOTA DE DÉBITO",
    tiposRegistroPermitidos: [1, 2],
    notas: "Exige comprobante asociado.",
  },
  {
    codigo: 112,
    descripcion: "TICKET MÁQUINA REGISTRADORA",
    tiposRegistroPermitidos: [1, 2],
    requiereNumero: false,
    permiteGravado: false,
    notas: "COMPRAS: solo total. Sin número de comprobante.",
  },
  {
    codigo: 201,
    descripcion: "COMPROBANTE DE EGRESOS POR COMPRAS A CRÉDITO",
    tiposRegistroPermitidos: [4],
    notas: "Exige asociado.",
  },
  { codigo: 202, descripcion: "COMPROBANTE DEL EXTERIOR LEGALIZADO", tiposRegistroPermitidos: [4] },
  {
    codigo: 203,
    descripcion: "COMPROBANTE DE INGRESO POR VENTAS A CRÉDITO",
    tiposRegistroPermitidos: [3],
    notas: "Exige asociado. Solo total.",
  },
  {
    codigo: 204,
    descripcion: "COMPROBANTE DE INGRESOS ENTIDADES PÚBLICAS, RELIGIOSAS O DE BENEFICIO PÚBLICO",
    tiposRegistroPermitidos: [4],
  },
  {
    codigo: 205,
    descripcion: "EXTRACTO DE CUENTA – BILLETAJE ELECTRÓNICO",
    tiposRegistroPermitidos: [4],
  },
  {
    codigo: 206,
    descripcion: "EXTRACTO DE CUENTA DE IPS",
    tiposRegistroPermitidos: [4],
    requiereNumero: false,
    notas: "Fecha en mm/aaaa. Exige identificador empleador IPS.",
  },
  {
    codigo: 207,
    descripcion: "EXTRACTO DE CUENTA TC/TD",
    tiposRegistroPermitidos: [4],
    notas: "Exige número cuenta + banco.",
  },
  {
    codigo: 208,
    descripcion: "LIQUIDACIÓN DE SALARIO",
    tiposRegistroPermitidos: [3, 4],
    requiereNumero: false,
    notas: "Fecha en mm/aaaa.",
  },
  {
    codigo: 209,
    descripcion: "OTROS COMPROBANTES DE EGRESOS",
    tiposRegistroPermitidos: [4],
    notas: "Exige especificar tipo documento.",
  },
  {
    codigo: 210,
    descripcion: "OTROS COMPROBANTES DE INGRESOS",
    tiposRegistroPermitidos: [3],
    notas: "Exige especificar tipo documento.",
  },
  {
    codigo: 211,
    descripcion: "TRANSFERENCIAS O GIROS BANCARIOS / BOLETA DE DEPÓSITO",
    tiposRegistroPermitidos: [4],
    notas: "Exige número cuenta + banco.",
  },
];

// Tabla 5 — Booleano
const BOOLEANOS = [
  { codigo: "S", descripcion: "SI" },
  { codigo: "N", descripcion: "NO" },
];

async function main() {
  console.log("Sembrando catálogos SET (junio/2021)…");

  for (const tr of TIPOS_REGISTRO) {
    await prisma.catalogoTipoRegistro.upsert({
      where: { codigo: tr.codigo },
      update: { descripcion: tr.descripcion },
      create: { codigo: tr.codigo, descripcion: tr.descripcion, vigenteDesde: VIGENTE_DESDE },
    });
  }

  for (const c of CONDICIONES) {
    await prisma.catalogoCondicion.upsert({
      where: { codigo: c.codigo },
      update: { descripcion: c.descripcion },
      create: { codigo: c.codigo, descripcion: c.descripcion, vigenteDesde: VIGENTE_DESDE },
    });
  }

  for (const ti of TIPOS_IDENTIFICACION) {
    await prisma.catalogoTipoIdentificacion.upsert({
      where: { codigo: ti.codigo },
      update: { descripcion: ti.descripcion },
      create: { codigo: ti.codigo, descripcion: ti.descripcion, vigenteDesde: VIGENTE_DESDE },
    });
  }

  for (const tc of TIPOS_COMPROBANTE) {
    await prisma.catalogoTipoComprobante.upsert({
      where: { codigo: tc.codigo },
      update: {
        descripcion: tc.descripcion,
        tiposRegistroPermitidos: tc.tiposRegistroPermitidos,
        requiereTimbrado: tc.requiereTimbrado ?? true,
        requiereNumero: tc.requiereNumero ?? true,
        permiteGravado: tc.permiteGravado ?? true,
        notas: tc.notas ?? null,
      },
      create: {
        codigo: tc.codigo,
        descripcion: tc.descripcion,
        tiposRegistroPermitidos: tc.tiposRegistroPermitidos,
        requiereTimbrado: tc.requiereTimbrado ?? true,
        requiereNumero: tc.requiereNumero ?? true,
        permiteGravado: tc.permiteGravado ?? true,
        notas: tc.notas ?? null,
        vigenteDesde: VIGENTE_DESDE,
      },
    });
  }

  for (const b of BOOLEANOS) {
    await prisma.catalogoBooleano.upsert({
      where: { codigo: b.codigo },
      update: { descripcion: b.descripcion },
      create: { codigo: b.codigo, descripcion: b.descripcion },
    });
  }

  const counts = {
    tipoRegistro: await prisma.catalogoTipoRegistro.count(),
    condicion: await prisma.catalogoCondicion.count(),
    tipoIdentificacion: await prisma.catalogoTipoIdentificacion.count(),
    tipoComprobante: await prisma.catalogoTipoComprobante.count(),
    booleano: await prisma.catalogoBooleano.count(),
  };
  console.log("Seed OK:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
