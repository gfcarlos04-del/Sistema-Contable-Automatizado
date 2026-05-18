import JSZip from "jszip";

// ── Types ─────────────────────────────────────────────────────────────────

export interface ComprobanteExportar {
  id: string;
  tipoRegistro: number;
  tipoComprobante: number;
  fechaEmision: Date | null;
  timbrado: string | null;
  numero: string | null;
  tipoIdentificacionContraparte: number | null;
  rucContraparte: string | null;
  dvContraparte: number | null;
  nombreContraparte: string | null;
  montoGravado10: number | bigint;
  montoGravado5: number | bigint;
  exento: number | bigint;
  total: number | bigint;
  condicionOperacion: number | null;
  operacionMonedaExtranjera: string;
  imputaIva: string;
  imputaIre: string;
  imputaIrpRsp: string;
  noImputa: string;
  comprobanteAsociadoNumero: string | null;
  comprobanteAsociadoTimbrado: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function toNum(v: number | bigint): number {
  return typeof v === "bigint" ? Number(v) : v;
}

function formatFecha(d: Date | null): string {
  if (!d) return "";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function s(v: string | number | null | undefined): string {
  if (v == null) return "";
  return String(v);
}

function buildLinea(c: ComprobanteExportar): string {
  const tipoIdentif = s(c.tipoIdentificacionContraparte);
  const ruc = s(c.rucContraparte);
  const nombre = s(c.nombreContraparte);
  const tipoComp = s(c.tipoComprobante);
  const fecha = formatFecha(c.fechaEmision);
  const timbrado = s(c.timbrado);
  const numero = s(c.numero);
  const gravado10 = s(toNum(c.montoGravado10));
  const gravado5 = s(toNum(c.montoGravado5));
  const exento = s(toNum(c.exento));
  const total = s(toNum(c.total));
  const condicion = s(c.condicionOperacion);
  const monedaExtranjera = s(c.operacionMonedaExtranjera) || "N";
  const imputaIva = c.imputaIva === "S" ? "S" : "N";
  const imputaIre = c.imputaIre === "S" ? "S" : "N";
  const imputaIrpRsp = c.imputaIrpRsp === "S" ? "S" : "N";
  const noImputa = c.noImputa === "S" ? "S" : "N";
  const nroAsociado = s(c.comprobanteAsociadoNumero);
  const timbradoAsociado = s(c.comprobanteAsociadoTimbrado);

  if (c.tipoRegistro === 1) {
    // VENTAS — 19 columns
    return [
      "1",
      tipoIdentif,
      ruc,
      nombre,
      tipoComp,
      fecha,
      timbrado,
      numero,
      gravado10,
      gravado5,
      exento,
      total,
      condicion,
      monedaExtranjera,
      imputaIva,
      imputaIre,
      imputaIrpRsp,
      nroAsociado,
      timbradoAsociado,
    ].join("|");
  }

  // COMPRAS — 20 columns (includes noImputa)
  return [
    "2",
    tipoIdentif,
    ruc,
    nombre,
    tipoComp,
    fecha,
    timbrado,
    numero,
    gravado10,
    gravado5,
    exento,
    total,
    condicion,
    monedaExtranjera,
    imputaIva,
    imputaIre,
    imputaIrpRsp,
    noImputa,
    nroAsociado,
    timbradoAsociado,
  ].join("|");
}

// ── Public functions ──────────────────────────────────────────────────────

export function buildLineasExportacion(comprobantes: ComprobanteExportar[]): {
  ventas: string[];
  compras: string[];
  ingresos: string[];
  egresos: string[];
} {
  const ventas: string[] = [];
  const compras: string[] = [];
  const ingresos: string[] = [];
  const egresos: string[] = [];

  for (const c of comprobantes) {
    const linea = buildLinea(c);
    if (c.tipoRegistro === 1) ventas.push(linea);
    else if (c.tipoRegistro === 2) compras.push(linea);
    else if (c.tipoRegistro === 3) ingresos.push(linea);
    else if (c.tipoRegistro === 4) egresos.push(linea);
  }

  return { ventas, compras, ingresos, egresos };
}

/** Máximo de filas por archivo según Especificación Técnica SET. */
const MAX_FILAS_POR_ARCHIVO = 5000;

/**
 * Divide un array de líneas en bloques de máximo MAX_FILAS_POR_ARCHIVO.
 * Si hay un solo bloque devuelve [lineas]; si hay más, devuelve [bloque1, bloque2, …].
 */
function chunkLineas(lineas: string[]): string[][] {
  if (lineas.length <= MAX_FILAS_POR_ARCHIVO) return [lineas];
  const chunks: string[][] = [];
  for (let i = 0; i < lineas.length; i += MAX_FILAS_POR_ARCHIVO) {
    chunks.push(lineas.slice(i, i + MAX_FILAS_POR_ARCHIVO));
  }
  return chunks;
}

export async function buildZipMara(
  comprobantes: ComprobanteExportar[],
  clienteRuc: string,
  periodo: string, // MM/YYYY
): Promise<Buffer> {
  const [mm, yyyy] = periodo.split("/");
  const mmaa = `${mm}${yyyy}`; // MMAAAA

  const { ventas, compras, ingresos, egresos } = buildLineasExportacion(comprobantes);

  const zip = new JSZip();

  const grupos: { tipo: number; lineas: string[] }[] = [
    { tipo: 1, lineas: ventas },
    { tipo: 2, lineas: compras },
    { tipo: 3, lineas: ingresos },
    { tipo: 4, lineas: egresos },
  ];

  for (const grupo of grupos) {
    if (grupo.lineas.length === 0) continue;
    const chunks = chunkLineas(grupo.lineas);
    chunks.forEach((chunk, idx) => {
      // Cuando hay un solo chunk omitir el sufijo numérico para compatibilidad.
      const suffix = chunks.length === 1 ? "" : `_${String(idx + 1).padStart(2, "0")}`;
      const filename = `${grupo.tipo}_${clienteRuc}_${mmaa}${suffix}.txt`;
      const content = chunk.join("\r\n") + "\r\n";
      zip.file(filename, content);
    });
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return buffer;
}
