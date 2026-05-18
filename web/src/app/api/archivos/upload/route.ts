// POST /api/archivos/upload
// Recibe un archivo (multipart/form-data), computa SHA-256 server-side,
// verifica deduplicación, sube a R2 y crea los registros Archivo + Comprobante.
// Devuelve { comprobanteId } o { duplicado: true, comprobanteId }.

import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildStorageKey, putObject } from "@/lib/storage";
import { COLAS, getQueue } from "@/lib/queue";

export const runtime = "nodejs";

const MIMES_PERMITIDOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
]);

const MIME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/tiff": "tiff",
};

const MAX_TAMANO_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo inválido: se esperaba multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const clienteId = formData.get("clienteId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Campo 'file' requerido" }, { status: 400 });
  }
  if (typeof clienteId !== "string" || !clienteId) {
    return NextResponse.json({ error: "Campo 'clienteId' requerido" }, { status: 400 });
  }

  // Validar MIME
  if (!MIMES_PERMITIDOS.has(file.type)) {
    return NextResponse.json(
      { error: `Tipo de archivo no permitido: ${file.type}. Aceptamos PDF, JPG, PNG, WebP, TIFF.` },
      { status: 422 },
    );
  }

  // Validar tamaño
  if (file.size > MAX_TAMANO_BYTES) {
    return NextResponse.json({ error: "El archivo supera el límite de 20 MB" }, { status: 422 });
  }

  // Verificar que el cliente pertenece a la organización
  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, organizacionId: session.user.organizacionId, activo: true },
    select: { id: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  // Leer el archivo en memoria y computar SHA-256
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  // Verificar duplicado (mismo archivo, mismo cliente)
  const archivoExistente = await prisma.archivo.findFirst({
    where: { clienteId, hashSha256: sha256 },
    select: { id: true },
  });

  if (archivoExistente) {
    const comprobanteExistente = await prisma.comprobante.findFirst({
      where: { archivoId: archivoExistente.id },
      select: { id: true },
    });
    return NextResponse.json({
      duplicado: true,
      archivoId: archivoExistente.id,
      comprobanteId: comprobanteExistente?.id ?? null,
    });
  }

  // Construir ruta en R2
  const now = new Date();
  const key = buildStorageKey({
    organizacionId: session.user.organizacionId,
    clienteId,
    fecha: now,
    hashSha256: sha256,
    extension: MIME_EXT[file.type] ?? "bin",
  });

  // Subir a R2
  try {
    await putObject(key, buffer, file.type);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error al subir el archivo: ${msg}` }, { status: 503 });
  }

  // Crear Archivo + Comprobante en una transacción
  const { archivo, comprobante } = await prisma.$transaction(async (tx) => {
    const archivo = await tx.archivo.create({
      data: {
        organizacionId: session.user.organizacionId,
        clienteId,
        ruta: key,
        mime: file.type,
        tamanoBytes: BigInt(file.size),
        hashSha256: sha256,
        subidoPorId: session.user.id,
      },
    });

    const comprobante = await tx.comprobante.create({
      data: {
        organizacionId: session.user.organizacionId,
        clienteId,
        archivoId: archivo.id,
        hashArchivo: sha256,
        tipoRegistro: 0, // placeholder; Gemini lo actualiza en F2
        tipoComprobante: 0,
        estado: "CARGADO",
        creadoPorId: session.user.id,
        origen: "MANUAL_PDF_IMG",
      },
    });

    return { archivo, comprobante };
  });

  // Encolar job de extracción (best-effort; si Redis no está configurado, omitir)
  try {
    const queue = getQueue(COLAS.EXTRACCION);
    await queue.add("extraer", {
      archivoId: archivo.id,
      comprobanteId: comprobante.id,
      organizacionId: session.user.organizacionId,
      clienteId,
    });
  } catch {
    // Redis no configurado en F1 — continuar sin encolar
  }

  return NextResponse.json({ comprobanteId: comprobante.id, archivoId: archivo.id });
}
