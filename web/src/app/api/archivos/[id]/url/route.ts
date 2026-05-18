// GET /api/archivos/[id]/url
// Devuelve una URL firmada (5 min) para visualizar el archivo en el visor.
// Valida que el archivo pertenezca a la organización del usuario.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { presignedGetUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id: archivoId } = await props.params;

  const archivo = await prisma.archivo.findFirst({
    where: { id: archivoId, organizacionId: session.user.organizacionId },
    select: { ruta: true, mime: true },
  });

  if (!archivo) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  try {
    const url = await presignedGetUrl(archivo.ruta, 300); // 5 min
    return NextResponse.json({ url, mime: archivo.mime });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Almacenamiento no configurado: ${msg}` }, { status: 503 });
  }
}
