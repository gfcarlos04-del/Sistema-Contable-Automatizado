import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildZipMara, type ComprobanteExportar } from "@/lib/exportar";
import { putObject, presignedGetUrl } from "@/lib/storage";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { clienteId?: string; periodo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { clienteId, periodo } = body;

  if (!clienteId || !periodo) {
    return NextResponse.json({ error: "clienteId y periodo son obligatorios" }, { status: 400 });
  }

  // Validate periodo format MM/YYYY
  if (!/^\d{2}\/\d{4}$/.test(periodo)) {
    return NextResponse.json({ error: "periodo debe tener formato MM/YYYY" }, { status: 400 });
  }

  const [mm, yyyy] = periodo.split("/");
  const periodoStr = `${yyyy}-${mm}`; // for DB period matching

  // Verify cliente belongs to org
  const cliente = await prisma.cliente.findFirst({
    where: {
      id: clienteId,
      organizacionId: session.user.organizacionId,
      activo: true,
    },
    select: { id: true, ruc: true, dv: true, razonSocial: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  // Fetch REGISTRADO comprobantes for this client in the period
  // Period matching: fechaEmision within the month
  const periodoStart = new Date(`${yyyy}-${mm}-01`);
  const nextMonth = new Date(periodoStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const comprobantes = await prisma.comprobante.findMany({
    where: {
      organizacionId: session.user.organizacionId,
      clienteId,
      estado: "REGISTRADO",
      fechaEmision: {
        gte: periodoStart,
        lt: nextMonth,
      },
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
      { error: "No hay comprobantes REGISTRADO para el período seleccionado" },
      { status: 422 },
    );
  }

  // Build ZIP
  const exportables: ComprobanteExportar[] = comprobantes.map((c) => ({
    ...c,
    montoGravado10: Number(c.montoGravado10),
    montoGravado5: Number(c.montoGravado5),
    exento: Number(c.exento),
    total: Number(c.total),
  }));

  const mmaa = `${mm}${yyyy}`;
  const zipFilename = `${cliente.ruc}_${mmaa}_COMPROBANTES.zip`;
  const zipBuffer = await buildZipMara(exportables, cliente.ruc, periodo);

  // Compute hash
  const hashSha256 = crypto.createHash("sha256").update(zipBuffer).digest("hex");

  // Save to R2
  const rutaArchivo = `exportaciones/${session.user.organizacionId}/${clienteId}/${periodoStr}/${zipFilename}`;
  await putObject(rutaArchivo, zipBuffer, "application/zip");

  // Create Exportacion record
  const exportacion = await prisma.exportacion.create({
    data: {
      organizacionId: session.user.organizacionId,
      clienteId,
      tipo: "MARANGATU_ZIP",
      periodo: periodoStr,
      rutaArchivo,
      hashArchivo: hashSha256,
      registrosIncluidos: comprobantes.length,
      creadoPorId: session.user.id,
    },
    select: { id: true },
  });

  // Generate presigned URL (60 min)
  const url = await presignedGetUrl(rutaArchivo, 3600);

  return NextResponse.json({
    ok: true,
    exportacionId: exportacion.id,
    url,
    registros: comprobantes.length,
    filename: zipFilename,
  });
}
