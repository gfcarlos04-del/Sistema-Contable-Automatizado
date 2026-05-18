import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildLibroIvaExcel } from "@/lib/exportar-excel";
import type { ComprobanteExportar } from "@/lib/exportar";
import { putObject, presignedGetUrl } from "@/lib/storage";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { clienteId?: string; anio?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { clienteId, anio } = body;

  if (!clienteId || !anio) {
    return NextResponse.json({ error: "clienteId y anio son obligatorios" }, { status: 400 });
  }

  if (!Number.isInteger(anio) || anio < 2021 || anio > 2100) {
    return NextResponse.json({ error: "anio debe ser un año válido (>= 2021)" }, { status: 400 });
  }

  const { organizacionId } = session.user;

  // Verify cliente belongs to org
  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, organizacionId, activo: true },
    select: { id: true, ruc: true, dv: true, razonSocial: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  // Fetch REGISTRADO comprobantes for this client in the year
  const periodoStart = new Date(Date.UTC(anio, 0, 1));
  const periodoEnd = new Date(Date.UTC(anio + 1, 0, 1));

  const comprobantes = await prisma.comprobante.findMany({
    where: {
      organizacionId,
      clienteId,
      estado: "REGISTRADO",
      fechaEmision: { gte: periodoStart, lt: periodoEnd },
    },
    select: {
      id: true,
      tipoRegistro: true,
      tipoComprobante: true,
      fechaEmision: true,
      timbrado: true,
      numero: true,
      tipoIdentificacionContraparte: true,
      rucContraparte: true,
      dvContraparte: true,
      nombreContraparte: true,
      montoGravado10: true,
      montoGravado5: true,
      exento: true,
      total: true,
      condicionOperacion: true,
      operacionMonedaExtranjera: true,
      imputaIva: true,
      imputaIre: true,
      imputaIrpRsp: true,
      noImputa: true,
      comprobanteAsociadoNumero: true,
      comprobanteAsociadoTimbrado: true,
    },
    orderBy: { fechaEmision: "asc" },
  });

  if (comprobantes.length === 0) {
    return NextResponse.json(
      { error: "No hay comprobantes REGISTRADO para el año seleccionado" },
      { status: 422 },
    );
  }

  const exportables: ComprobanteExportar[] = comprobantes.map((c) => ({
    ...c,
    montoGravado10: Number(c.montoGravado10),
    montoGravado5: Number(c.montoGravado5),
    exento: Number(c.exento),
    total: Number(c.total),
  }));

  // Build Excel
  const excelBuffer = await buildLibroIvaExcel(
    exportables,
    { razonSocial: cliente.razonSocial, ruc: cliente.ruc, dv: cliente.dv },
    anio,
  );

  // Compute hash
  const hashSha256 = crypto.createHash("sha256").update(excelBuffer).digest("hex");

  // Save to R2
  const filename = `LIBRO_IVA_${cliente.ruc}_${anio}.xlsx`;
  const rutaArchivo = `exportaciones/${organizacionId}/${clienteId}/${anio}/${filename}`;
  await putObject(
    rutaArchivo,
    excelBuffer,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  // Create Exportacion record
  const exportacion = await prisma.exportacion.create({
    data: {
      organizacionId,
      clienteId,
      tipo: "LIBRO_IVA",
      periodo: String(anio),
      rutaArchivo,
      hashArchivo: hashSha256,
      registrosIncluidos: comprobantes.length,
      creadoPorId: session.user.id,
    },
    select: { id: true },
  });

  // Presigned download URL (60 min)
  const url = await presignedGetUrl(rutaArchivo, 3600);

  return NextResponse.json({
    ok: true,
    exportacionId: exportacion.id,
    url,
    registros: comprobantes.length,
    filename,
  });
}
