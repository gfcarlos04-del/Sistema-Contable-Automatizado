import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseStringPromise } from "xml2js";

// ── SIFEN iTipDE → tipoComprobante mapping ────────────────────────────────

const TIPO_DE_MAP: Record<number, number> = {
  1: 109, // Factura electrónica
  4: 101, // Autofactura
  5: 110, // Nota de crédito
  6: 111, // Nota de débito
};

// Default tipoRegistro by tipDE (1=Ventas, 2=Compras — determined by context)
// For e-Kuatia we default to 1 (Ventas) since the emitter is always the client;
// the user can edit afterward if needed.

// ── XML parser helpers ────────────────────────────────────────────────────

function first<T>(val: T | T[] | undefined): T | undefined {
  if (val === undefined) return undefined;
  return Array.isArray(val) ? val[0] : val;
}

function text(val: unknown): string {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return val.trim();
  if (Array.isArray(val) && val.length > 0) return String(val[0]).trim();
  return String(val).trim();
}

interface ParsedDoc {
  timbrado: string | null;
  numero: string | null;
  fechaEmision: Date | null;
  tipoComprobante: number;
  // Emisor
  rucEmisor: string | null;
  dvEmisor: number | null;
  nombreEmisor: string | null;
  // Receptor
  rucReceptor: string | null;
  dvReceptor: number | null;
  nombreReceptor: string | null;
  // Totales
  montoGravado10: number;
  iva10: number;
  montoGravado5: number;
  iva5: number;
  exento: number;
  total: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDoc(root: any): ParsedDoc {
  // Navigate: rDE > DE
  const rDE = first(root?.rDE) ?? root;
  const DE = first(rDE?.DE) ?? {};

  // gTimb
  const gTimb = first(DE?.gTimb) ?? {};
  const timbrado = text(first(gTimb?.dNumTim)) || null;

  // gDatGralOpe (may appear multiple times in some versions)
  const gDatGralOpeArr: unknown[] = Array.isArray(DE?.gDatGralOpe)
    ? (DE.gDatGralOpe as unknown[])
    : DE?.gDatGralOpe
      ? [DE.gDatGralOpe]
      : [];

  let fechaEmision: Date | null = null;
  let rucReceptor: string | null = null;
  let dvReceptor: number | null = null;
  let nombreReceptor: string | null = null;

  for (const gDatGralOpe of gDatGralOpeArr) {
    const op = gDatGralOpe as Record<string, unknown>;
    const feEmi = text(first(op?.dFeEmiDE as unknown));
    if (feEmi && !fechaEmision) {
      const parsed = new Date(feEmi);
      if (!isNaN(parsed.getTime())) fechaEmision = parsed;
    }
    const gDatRec = first(op?.gDatRec as unknown) as Record<string, unknown> | undefined;
    if (gDatRec) {
      rucReceptor = text(first(gDatRec?.dRucRec as unknown)) || null;
      const dvText = text(first(gDatRec?.dDvRec as unknown));
      dvReceptor = dvText ? parseInt(dvText, 10) : null;
      nombreReceptor = text(first(gDatRec?.dNomRec as unknown)) || null;
    }
  }

  // gEmis
  const gEmis = (first(DE?.gEmis) as Record<string, unknown> | undefined) ?? {};
  const rucEmisor = text(first(gEmis?.dRucEm as unknown)) || null;
  const dvEmisorText = text(first(gEmis?.dDvEmi as unknown));
  const dvEmisor = dvEmisorText ? parseInt(dvEmisorText, 10) : null;
  const nombreEmisor = text(first(gEmis?.dNomEmi as unknown)) || null;

  // gDtipDE
  const gDtipDE = (first(DE?.gDtipDE) as Record<string, unknown> | undefined) ?? {};
  const dNumDE = text(first(gDtipDE?.dNumDE as unknown)) || null;
  const iTipDEText = text(first(gDtipDE?.iTipDE as unknown));
  const iTipDE = iTipDEText ? parseInt(iTipDEText, 10) : 1;
  const tipoComprobante = TIPO_DE_MAP[iTipDE] ?? 109;

  // numero: SIFEN format is "001-001-0000001" — already matches Marangatu format
  const numero = dNumDE;

  // gTotSub
  const gTotSub = (first(DE?.gTotSub) as Record<string, unknown> | undefined) ?? {};
  const montoGravado10 = parseFloat(text(first(gTotSub?.dTotGravIVA10 as unknown)) || "0") || 0;
  const iva10 = parseFloat(text(first(gTotSub?.dTotIVA10 as unknown)) || "0") || 0;
  const montoGravado5 = parseFloat(text(first(gTotSub?.dTotGravIVA5 as unknown)) || "0") || 0;
  const iva5 = parseFloat(text(first(gTotSub?.dTotIVA5 as unknown)) || "0") || 0;
  const exento = parseFloat(text(first(gTotSub?.dTotExe as unknown)) || "0") || 0;
  const total = parseFloat(text(first(gTotSub?.dTotGralOpe as unknown)) || "0") || 0;

  return {
    timbrado,
    numero,
    fechaEmision,
    tipoComprobante,
    rucEmisor,
    dvEmisor,
    nombreEmisor,
    rucReceptor,
    dvReceptor,
    nombreReceptor,
    montoGravado10,
    iva10,
    montoGravado5,
    iva5,
    exento,
    total,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  const clienteId = formData.get("clienteId");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Campo 'file' requerido" }, { status: 400 });
  }
  if (!clienteId || typeof clienteId !== "string") {
    return NextResponse.json({ error: "Campo 'clienteId' requerido" }, { status: 400 });
  }

  const { organizacionId } = session.user;

  // Verify cliente belongs to org
  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, organizacionId, activo: true },
    select: { id: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  // Read XML content
  const xmlText = await (file as File).text();

  // Parse XML
  let parsed: ParsedDoc;
  try {
    const root = await parseStringPromise(xmlText, { explicitArray: true, trim: true });
    parsed = extractDoc(root);
  } catch {
    return NextResponse.json({ error: "El archivo no es un XML válido" }, { status: 400 });
  }

  // Create comprobante with REGISTRADO state, E_KUATIA_XML origin
  const comprobante = await prisma.comprobante.create({
    data: {
      organizacionId,
      clienteId,
      estado: "REGISTRADO",
      origen: "E_KUATIA_XML",
      tipoRegistro: 1, // Default Ventas — user can edit after import
      tipoComprobante: parsed.tipoComprobante,
      fechaEmision: parsed.fechaEmision,
      timbrado: parsed.timbrado,
      numero: parsed.numero,
      rucContraparte: parsed.rucReceptor,
      dvContraparte: parsed.dvReceptor,
      nombreContraparte: parsed.nombreReceptor,
      tipoIdentificacionContraparte: parsed.rucReceptor ? 1 : null, // 1 = RUC
      montoGravado10: parsed.montoGravado10,
      iva10: parsed.iva10,
      montoGravado5: parsed.montoGravado5,
      iva5: parsed.iva5,
      exento: parsed.exento,
      total: parsed.total,
      condicionOperacion: 1, // Default: contado
      operacionMonedaExtranjera: "N",
      imputaIva: "S",
      imputaIre: "N",
      imputaIrpRsp: "N",
      noImputa: "N",
      creadoPorId: session.user.id,
    },
    select: { id: true },
  });

  return NextResponse.json({ comprobanteId: comprobante.id });
}
