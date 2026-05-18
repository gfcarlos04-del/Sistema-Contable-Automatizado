import { calcularDV } from "@/lib/ruc";

// ── Types ─────────────────────────────────────────────────────────────────

export interface ErrorValidacion {
  codigo: string;
  mensaje: string;
  severidad: "BLOQ" | "ADV";
  campo?: string;
}

export interface CampoValidar {
  campo: string;
  confianza: number | null;
  status: string;
}

export interface ComprobanteParaValidar {
  tipoRegistro: number;
  tipoComprobante: number;
  fechaEmision: Date | null;
  timbrado: string | null;
  numero: string | null;
  rucContraparte: string | null;
  dvContraparte: number | null;
  montoGravado10: number | bigint;
  iva10: number | bigint;
  montoGravado5: number | bigint;
  iva5: number | bigint;
  exento: number | bigint;
  total: number | bigint;
  imputaIva: string;
  imputaIre: string;
  imputaIrpRsp: string;
  noImputa: string;
  estado?: string;
  campos: CampoValidar[];
}

// ── Helpers ───────────────────────────────────────────────────────────────

function toNumber(v: number | bigint): number {
  return typeof v === "bigint" ? Number(v) : v;
}

const CRITICAL_CAMPOS = [
  "ruc_emisor",
  "timbrado",
  "numero_comprobante",
  "fecha_emision",
  "total",
  "monto_gravado_10_iva_incluido",
  "monto_gravado_5_iva_incluido",
  "iva_10",
  "iva_5",
  "exento",
];

// ── Main validator ────────────────────────────────────────────────────────

export function validarComprobante(c: ComprobanteParaValidar): ErrorValidacion[] {
  const errors: ErrorValidacion[] = [];

  const gravado10 = toNumber(c.montoGravado10);
  const gravado5 = toNumber(c.montoGravado5);
  const exento = toNumber(c.exento);
  const total = toNumber(c.total);
  const tipo = c.tipoComprobante;
  const registro = c.tipoRegistro;

  // V-001: total = gravado10 + gravado5 + exento (±2 Gs)
  // Skip for types 101,104,105,112 in COMPRAS (tipoRegistro=2)
  const skipV001 = registro === 2 && [101, 104, 105, 112].includes(tipo);
  if (!skipV001) {
    const suma = gravado10 + gravado5 + exento;
    if (Math.abs(suma - total) > 2) {
      errors.push({
        codigo: "V-001",
        mensaje: `La suma de gravados y exento (${suma.toLocaleString("es-PY")}) no coincide con el total (${total.toLocaleString("es-PY")}).`,
        severidad: "BLOQ",
      });
    }
  }

  // V-003: DV módulo 11 — ADV
  if (c.rucContraparte && c.dvContraparte != null) {
    try {
      const dvCalc = calcularDV(c.rucContraparte);
      if (dvCalc !== c.dvContraparte) {
        errors.push({
          codigo: "V-003",
          mensaje: `DV incorrecto: calculado ${dvCalc}, informado ${c.dvContraparte}.`,
          severidad: "ADV",
          campo: "dvContraparte",
        });
      }
    } catch {
      // RUC format issue — skip DV check
    }
  }

  // V-004: Timbrado 8 digits — BLOQ — skip for type 107
  if (tipo !== 107 && c.timbrado != null) {
    if (!/^\d{8}$/.test(c.timbrado)) {
      errors.push({
        codigo: "V-004",
        mensaje: `El timbrado debe tener exactamente 8 dígitos numéricos.`,
        severidad: "BLOQ",
        campo: "timbrado",
      });
    }
  }

  // V-005: Numero format — BLOQ — skip for types 106,107,112,208,205,206,207
  if (![106, 107, 112, 208, 205, 206, 207].includes(tipo) && c.numero != null) {
    if (!/^\d{3}-\d{3}-\d{7}$/.test(c.numero)) {
      errors.push({
        codigo: "V-005",
        mensaje: `El número de comprobante debe tener el formato 000-000-0000000.`,
        severidad: "BLOQ",
        campo: "numero",
      });
    }
  }

  // V-006: Fecha válida, no futura, >= 2021-01-01 — BLOQ — skip for 208,206
  if (![208, 206].includes(tipo)) {
    if (!c.fechaEmision) {
      errors.push({
        codigo: "V-006",
        mensaje: "La fecha de emisión es obligatoria.",
        severidad: "BLOQ",
        campo: "fechaEmision",
      });
    } else {
      const fecha = new Date(c.fechaEmision);
      const minFecha = new Date("2021-01-01");
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      if (fecha > hoy) {
        errors.push({
          codigo: "V-006",
          mensaje: "La fecha de emisión no puede ser futura.",
          severidad: "BLOQ",
          campo: "fechaEmision",
        });
      } else if (fecha < minFecha) {
        errors.push({
          codigo: "V-006",
          mensaje: "La fecha de emisión debe ser posterior al 01/01/2021.",
          severidad: "BLOQ",
          campo: "fechaEmision",
        });
      }
    }
  }

  // C-003: Total > 0 — BLOQ
  if (total <= 0) {
    errors.push({
      codigo: "C-003",
      mensaje: "El total debe ser mayor a cero.",
      severidad: "BLOQ",
      campo: "total",
    });
  }

  // V-014: At least one imputa = "S" — BLOQ (only for estado = REGISTRADO)
  if (c.estado === "REGISTRADO") {
    const tieneImputa =
      c.imputaIva === "S" || c.imputaIre === "S" || c.imputaIrpRsp === "S" || c.noImputa === "S";
    if (!tieneImputa) {
      errors.push({
        codigo: "V-014",
        mensaje: "Debe seleccionar al menos una imputación (IVA, IRE, IRP-RSP o No Imputa).",
        severidad: "BLOQ",
      });
    }
  }

  // K-001: Critical field with confidence < 70 — BLOQ
  for (const campoValidar of c.campos) {
    if (
      CRITICAL_CAMPOS.includes(campoValidar.campo) &&
      campoValidar.confianza != null &&
      campoValidar.confianza < 70
    ) {
      errors.push({
        codigo: "K-001",
        mensaje: `El campo "${campoValidar.campo}" tiene baja confianza (${campoValidar.confianza}%) y requiere revisión manual.`,
        severidad: "BLOQ",
        campo: campoValidar.campo,
      });
    }
  }

  return errors;
}
