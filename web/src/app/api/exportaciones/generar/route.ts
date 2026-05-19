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

  let body: { clienteId?: string; periodo?: string; anio?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { clienteId, periodo, anio } = body;

  if (!clienteId) {
    return NextResponse.json({ error: "clienteId es obligatorio" }, { status: 400 });
  }

  if (!periodo && anio === undefined) {
    return NextResponse.json(
      { error: "Se requiere periodo (MM/YYYY) o anio" },
      { status: 400 },
    );
  }

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

  // ── Caso anual ─────────────────────────────────────────────────────────────
  if (anio !== undefined) {
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2099) {
      return NextResponse.json({ error: "anio debe ser un año válido (2000-2099)" }, { status: 400 });
    }

    const periodoStart = new Date(`${anio}-01-01`);
    const periodoEnd = new Date(`${anio + 1}-01-01`);

    const comprobantes = await prisma.comprobante.findMany({
      where: {
        organizacionId: session.user.organizacionId,
        clienteId,
        estado: "REGISTRADO",
        // D-014: excluir e-Kuatia del ZIP Marangatu
        NOT: { origen: "E_KUATIA_XML" },
        fechaEmision: {
          gte: periodoStart,
          lt: periodoEnd,
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
        { error: `No hay comprobantes REGISTRADO para el año ${anio}` },
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

    const zipFilename = `${cliente.ruc}_${anio}_COMPROBANTES.zip`;
    const zipBuffer = await buildZipMara(exportables, cliente.ruc, `01/${anio}`);

    const hashSha256 = crypto.createHash("sha256").update(zipBuffer).digest("hex");

    const rutaArchivo = `exportaciones/${session.user.organizacionId}/${clienteId}/${anio}/${zipFilename}`;
    await putObject(rutaArchivo, zipBuffer, "application/zip");

    const exportacion = await prisma.exportacion.create({
      data: {
        organizacionId: session.user.organizacionId,
        clienteId,
        tipo: "MARANGATU_ZIP",
        periodo: String(anio),
        rutaArchivo,
        hashArchivo: hashSha256,
        registrosIncluidos: comprobantes.length,
        creadoPorId: session.user.id,
      },
      select: { id: true },
    });

    const url = await presignedGetUrl(rutaArchivo, 3600);

    return NextResponse.json({
      ok: true,
      exportacionId: exportacion.id,
      url,
      registros: comprobantes.length,
      filename: zipFilename,
    });
  }

  // ── Caso mensual ───────────────────────────────────────────────────────────
  if (!periodo) {
    return NextResponse.json({ error: "periodo es obligatorio" }, { status: 400 });
  }

  // Validate periodo format MM/YYYY
  if (!/^\d{2}\/\d{4}$/.test(periodo)) {
    return NextResponse.json({ error: "periodo debe tener formato MM/YYYY" }, { status: 400 });
  }

  const [mm, yyyy] = periodo.split("/");
  const periodoStr = `${yyyy}-${mm}`; // for DB period matching

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
      // D-014: excluir e-Kuatia del ZIP Marangatu (igual que el caso anual)
      NOT: { origen: "E_KUATIA_XML" },
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
