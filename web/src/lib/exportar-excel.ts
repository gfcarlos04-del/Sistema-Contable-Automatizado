import ExcelJS from "exceljs";
import type { ComprobanteExportar } from "@/lib/exportar";

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

// ── Sheet builder ─────────────────────────────────────────────────────────

const VENTAS_HEADERS = [
  "Tipo Reg.",
  "Tipo Ident.",
  "N° Ident.",
  "Nombre/Razón Social",
  "Tipo Comp.",
  "Fecha",
  "Timbrado",
  "Número",
  "Grav.10% IVA inc.",
  "Grav.5% IVA inc.",
  "Exento",
  "Total",
  "Condición",
  "Mon.Ext.",
  "Imp.IVA",
  "Imp.IRE",
  "Imp.IRP-RSP",
  "N°Comp.Asoc.",
  "Tim.Asoc.",
];

const COMPRAS_HEADERS = [
  "Tipo Reg.",
  "Tipo Ident.",
  "N° Ident.",
  "Nombre/Razón Social",
  "Tipo Comp.",
  "Fecha",
  "Timbrado",
  "Número",
  "Grav.10% IVA inc.",
  "Grav.5% IVA inc.",
  "Exento",
  "Total",
  "Condición",
  "Mon.Ext.",
  "Imp.IVA",
  "Imp.IRE",
  "Imp.IRP-RSP",
  "No Imputa",
  "N°Comp.Asoc.",
  "Tim.Asoc.",
];

function buildVentasRow(c: ComprobanteExportar): (string | number)[] {
  return [
    c.tipoRegistro,
    c.tipoIdentificacionContraparte ?? "",
    s(c.rucContraparte),
    s(c.nombreContraparte),
    c.tipoComprobante,
    formatFecha(c.fechaEmision),
    s(c.timbrado),
    s(c.numero),
    toNum(c.montoGravado10),
    toNum(c.montoGravado5),
    toNum(c.exento),
    toNum(c.total),
    c.condicionOperacion ?? "",
    s(c.operacionMonedaExtranjera) || "N",
    c.imputaIva === "S" ? "S" : "N",
    c.imputaIre === "S" ? "S" : "N",
    c.imputaIrpRsp === "S" ? "S" : "N",
    s(c.comprobanteAsociadoNumero),
    s(c.comprobanteAsociadoTimbrado),
  ];
}

function buildComprasRow(c: ComprobanteExportar): (string | number)[] {
  return [
    c.tipoRegistro,
    c.tipoIdentificacionContraparte ?? "",
    s(c.rucContraparte),
    s(c.nombreContraparte),
    c.tipoComprobante,
    formatFecha(c.fechaEmision),
    s(c.timbrado),
    s(c.numero),
    toNum(c.montoGravado10),
    toNum(c.montoGravado5),
    toNum(c.exento),
    toNum(c.total),
    c.condicionOperacion ?? "",
    s(c.operacionMonedaExtranjera) || "N",
    c.imputaIva === "S" ? "S" : "N",
    c.imputaIre === "S" ? "S" : "N",
    c.imputaIrpRsp === "S" ? "S" : "N",
    c.noImputa === "S" ? "S" : "N",
    s(c.comprobanteAsociadoNumero),
    s(c.comprobanteAsociadoTimbrado),
  ];
}

function addSheetData(
  sheet: ExcelJS.Worksheet,
  headers: string[],
  rows: (string | number)[][],
  cliente: { razonSocial: string; ruc: string; dv: number },
  anio: number,
): void {
  // Row 1: RUC Informante
  sheet.getRow(1).getCell(1).value = "RUC Informante:";
  sheet.getRow(1).getCell(2).value = `${cliente.ruc}-${cliente.dv}`;

  // Row 2: Nombre/Razón Social
  sheet.getRow(2).getCell(1).value = "Nombre/Razón Social:";
  sheet.getRow(2).getCell(2).value = cliente.razonSocial;

  // Row 3: Ejercicio Fiscal
  sheet.getRow(3).getCell(1).value = "Ejercicio Fiscal:";
  sheet.getRow(3).getCell(2).value = anio;

  // Rows 4-9 are intentionally blank (reserved by SET format)

  // Row 10: column headers (bold)
  const headerRow = sheet.getRow(10);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };
  });
  headerRow.commit();

  // Row 11+: data
  rows.forEach((row, idx) => {
    const excelRow = sheet.getRow(11 + idx);
    row.forEach((val, i) => {
      excelRow.getCell(i + 1).value = val;
    });
    excelRow.commit();
  });
}

// ── Public function ───────────────────────────────────────────────────────

export async function buildLibroIvaExcel(
  comprobantes: ComprobanteExportar[],
  cliente: { razonSocial: string; ruc: string; dv: number },
  anio: number,
): Promise<Buffer> {
  const ventas = comprobantes.filter((c) => c.tipoRegistro === 1).map(buildVentasRow);
  const compras = comprobantes.filter((c) => c.tipoRegistro === 2).map(buildComprasRow);
  const ingresos = comprobantes.filter((c) => c.tipoRegistro === 3).map(buildVentasRow);
  const egresos = comprobantes.filter((c) => c.tipoRegistro === 4).map(buildComprasRow);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tavex";
  workbook.created = new Date();

  const sheetVentas = workbook.addWorksheet("VENTAS");
  const sheetCompras = workbook.addWorksheet("COMPRAS");
  const sheetIngresos = workbook.addWorksheet("INGRESOS");
  const sheetEgresos = workbook.addWorksheet("EGRESOS");

  addSheetData(sheetVentas, VENTAS_HEADERS, ventas, cliente, anio);
  addSheetData(sheetCompras, COMPRAS_HEADERS, compras, cliente, anio);
  addSheetData(sheetIngresos, VENTAS_HEADERS, ingresos, cliente, anio);
  addSheetData(sheetEgresos, COMPRAS_HEADERS, egresos, cliente, anio);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
