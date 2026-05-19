// POST /api/comprobantes/[id]/extraer
// Extracción síncrona con Gemini — no requiere Redis/BullMQ.
// Se usa cuando el worker no está disponible o el usuario dispara la extracción manualmente.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { procesarExtraccion } from "@/lib/extraer";

export const runtime = "nodejs";
// Extracción puede tardar hasta 60s en comprobantes complejos
export const maxDuration = 60;

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id: comprobanteId } = await props.params;

  // Verificar que el comprobante pertenece a la org
  const comprobante = await prisma.comprobante.findFirst({
    where: { id: comprobanteId, organizacionId: session.user.organizacionId },
    select: { id: true, archivoId: true, estado: true },
  });

  if (!comprobante) {
    return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 });
  }

  if (!comprobante.archivoId) {
    return NextResponse.json({ error: "Sin archivo adjunto" }, { status: 422 });
  }

  // Evitar re-extracción si ya está en proceso
  if (comprobante.estado === "EXTRAYENDO") {
    return NextResponse.json({ error: "Ya está siendo procesado" }, { status: 409 });
  }

  try {
    const resultado = await procesarExtraccion({
      comprobanteId,
      archivoId: comprobante.archivoId,
      organizacionId: session.user.organizacionId,
      requestId: `direct-${Date.now()}`,
    });

    return NextResponse.json(resultado);
  } catch (err) {
    // Marcar como revisión manual si falla
    await prisma.comprobante
      .update({
        where: { id: comprobanteId },
        data: { estado: "REQUIERE_REVISION_MANUAL" },
      })
      .catch(() => {});

    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
