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
  // Optional fields for extended validations
  comprobanteAsociadoNumero?: string | null;
  comprobanteAsociadoTimbrado?: string | null;
  nombreContraparte?: string | null;
  tipoIdentificacionContraparte?: number | null;
  condicionOperacion?: number | null;
  operacionMonedaExtranjera?: string | null;
  fechaPeriodo?: string | null; // MM/AAAA — para tipos 208 y 206
  regimenCliente?: string[] | null; // IVA | IRE | IRE_SIMPLE | IRP_RSP
}

// ── Helpers ───────────────────────────────────────────────────────────────

function toNumber(v: number | bigint): number {
  return typeof v === "bigint" ? Number(v) : v;
}

// Tabla 3 — Tipo de identificación válidos
const TIPOS_IDENTIFICACION_VALIDOS = new Set([11, 12, 13, 14, 15, 16, 17]);

// Tabla 4 — Tipos de comprobante por tipo de registro
const TIPOS_COMPROBANTE_POR_REGISTRO: Record<number, Set<number>> = {
  1: new Set([102, 103, 105, 106, 108, 109, 110, 111, 112]),
  2: new Set([101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112]),
  3: new Set([203, 208, 210]),
  4: new Set([201, 202, 204, 205, 206, 207, 208, 209, 211]),
};

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

  // V-007: Fecha período MM/AAAA ≥ 01/2021 — BLOQ — solo para tipos 206 y 208
  if ([206, 208].includes(tipo)) {
    if (!c.fechaPeriodo) {
      errors.push({
        codigo: "V-007",
        mensaje: "La fecha de período (MM/AAAA) es obligatoria para este tipo de comprobante.",
        severidad: "BLOQ",
        campo: "fechaPeriodo",
      });
    } else {
      if (!/^\d{2}\/\d{4}$/.test(c.fechaPeriodo)) {
        errors.push({
          codigo: "V-007",
          mensaje: `La fecha de período debe tener el formato MM/AAAA (ej: 06/2024). Valor recibido: "${c.fechaPeriodo}".`,
          severidad: "BLOQ",
          campo: "fechaPeriodo",
        });
      } else {
        const [mm, aaaa] = c.fechaPeriodo.split("/").map(Number);
        const anio = aaaa;
        const mes = mm;
        const MIN_ANIO = 2021;
        const MIN_MES = 1;
        if (
          mes < 1 || mes > 12 ||
          anio < MIN_ANIO ||
          (anio === MIN_ANIO && mes < MIN_MES)
        ) {
          errors.push({
            codigo: "V-007",
            mensaje: `La fecha de período debe ser ≥ 01/2021 y tener un mes válido (01–12). Valor recibido: "${c.fechaPeriodo}".`,
            severidad: "BLOQ",
            campo: "fechaPeriodo",
          });
        }
      }
    }
  }

  // V-008: Condición de operación ∈ {1,2} — BLOQ — solo para tipo 109 (Factura)
  if (tipo === 109 && c.condicionOperacion != null) {
    if (c.condicionOperacion !== 1 && c.condicionOperacion !== 2) {
      errors.push({
        codigo: "V-008",
        mensaje: `La condición de operación debe ser 1 (Contado) o 2 (Crédito). Valor recibido: ${c.condicionOperacion}.`,
        severidad: "BLOQ",
        campo: "condicionOperacion",
      });
    }
  }

  // V-009: Moneda extranjera ∈ {S, N} — BLOQ — todos
  if (c.operacionMonedaExtranjera != null) {
    if (c.operacionMonedaExtranjera !== "S" && c.operacionMonedaExtranjera !== "N") {
      errors.push({
        codigo: "V-009",
        mensaje: `Operación en moneda extranjera debe ser "S" o "N". Valor recibido: "${c.operacionMonedaExtranjera}".`,
        severidad: "BLOQ",
        campo: "operacionMonedaExtranjera",
      });
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

  // V-013: imputaIva, imputaIre, imputaIrpRsp ∈ {S, N} — BLOQ
  for (const [campo, valor] of [
    ["imputaIva", c.imputaIva],
    ["imputaIre", c.imputaIre],
    ["imputaIrpRsp", c.imputaIrpRsp],
  ] as const) {
    if (valor !== "S" && valor !== "N") {
      errors.push({
        codigo: "V-013",
        mensaje: `El campo "${campo}" debe ser "S" o "N". Valor recibido: "${valor}".`,
        severidad: "BLOQ",
        campo,
      });
    }
  }

  // V-002: RUC format — solo dígitos, longitud 1–8 — BLOQ
  if (c.rucContraparte != null && c.rucContraparte !== "") {
    if (!/^\d{1,8}$/.test(c.rucContraparte)) {
      errors.push({
        codigo: "V-002",
        mensaje: `El RUC de la contraparte debe contener entre 1 y 8 dígitos numéricos (sin DV).`,
        severidad: "BLOQ",
        campo: "rucContraparte",
      });
    }
  }

  // V-010: Tipo identificación contraparte ∈ Tabla 3 — BLOQ
  if (c.tipoIdentificacionContraparte != null) {
    if (!TIPOS_IDENTIFICACION_VALIDOS.has(c.tipoIdentificacionContraparte)) {
      errors.push({
        codigo: "V-010",
        mensaje: `Tipo de identificación ${c.tipoIdentificacionContraparte} no es válido. Valores permitidos: 11 (RUC), 12 (CI), 13 (Pasaporte), 14 (Cédula Extran.), 15 (Sin nombre), 16 (Diplomático), 17 (Id. Tributaria).`,
        severidad: "BLOQ",
        campo: "tipoIdentificacionContraparte",
      });
    }
  }

  // V-011: Tipo comprobante ∈ Tabla 4 y permitido para tipo de registro — BLOQ
  const tiposPermitidos = TIPOS_COMPROBANTE_POR_REGISTRO[registro];
  if (tiposPermitidos && !tiposPermitidos.has(tipo)) {
    errors.push({
      codigo: "V-011",
      mensaje: `El tipo de comprobante ${tipo} no está permitido para el tipo de registro ${registro}.`,
      severidad: "BLOQ",
      campo: "tipoComprobante",
    });
  }

  // V-012: Nombre obligatorio salvo que tipoIdentificacion ∈ {11,12,15} para ventas
  //        o ∈ {11,12} para compras/ingresos/egresos
  const tipoId = c.tipoIdentificacionContraparte ?? 0;
  const nombreOpcionalVentas = [11, 12, 15].includes(tipoId);
  const nombreOpcionalCompras = [11, 12].includes(tipoId);
  const nombreEsOpcional =
    (registro === 1 && nombreOpcionalVentas) ||
    ([2, 3, 4].includes(registro) && nombreOpcionalCompras);
  if (!nombreEsOpcional && !c.nombreContraparte) {
    errors.push({
      codigo: "V-012",
      mensaje: "El nombre/razón social de la contraparte es obligatorio para este tipo de identificación.",
      severidad: "BLOQ",
      campo: "nombreContraparte",
    });
  }

  // V-015: Si noImputa = "S", debe haber al menos otra imputación en "S" — BLOQ (COMPRAS y EGRESOS)
  if ((registro === 2 || registro === 4) && c.noImputa === "S") {
    const tieneOtra = c.imputaIva === "S" || c.imputaIre === "S" || c.imputaIrpRsp === "S";
    if (!tieneOtra) {
      errors.push({
        codigo: "V-015",
        mensaje: "Si se marca 'No imputa', debe seleccionarse al menos otra imputación (IVA, IRE o IRP-RSP).",
        severidad: "BLOQ",
      });
    }
  }

  // V-016: Régimen del cliente permite la imputación elegida — BLOQ
  // Solo aplica si regimenCliente está informado (no null/undefined)
  if (c.regimenCliente != null && c.regimenCliente.length > 0) {
    const reg = c.regimenCliente;
    if (c.imputaIva === "S" && !reg.includes("IVA")) {
      errors.push({
        codigo: "V-016",
        mensaje: "El cliente no está inscripto en IVA. No puede imputarse al IVA.",
        severidad: "BLOQ",
        campo: "imputaIva",
      });
    }
    if (c.imputaIre === "S" && !reg.includes("IRE") && !reg.includes("IRE_SIMPLE")) {
      errors.push({
        codigo: "V-016",
        mensaje: "El cliente no está inscripto en IRE ni IRE Simple. No puede imputarse al IRE.",
        severidad: "BLOQ",
        campo: "imputaIre",
      });
    }
    if (c.imputaIrpRsp === "S" && !reg.includes("IRP_RSP")) {
      errors.push({
        codigo: "V-016",
        mensaje: "El cliente no está inscripto en IRP-RSP. No puede imputarse al IRP-RSP.",
        severidad: "BLOQ",
        campo: "imputaIrpRsp",
      });
    }
  }

  // V-019: Para tipos 101/104/105/112 en COMPRAS — gravados y exento deben ser 0 — BLOQ
  if (registro === 2 && [101, 104, 105, 112].includes(tipo)) {
    if (gravado10 !== 0 || gravado5 !== 0 || exento !== 0) {
      errors.push({
        codigo: "V-019",
        mensaje: "Para este tipo de comprobante en Compras, los montos gravados y exento deben ser 0 (solo el total es informativo).",
        severidad: "BLOQ",
      });
    }
  }

  // V-017: Comprobante asociado número y timbrado requeridos para NC/ND — BLOQ
  const tiposConAsociado = [110, 111, 201, 203]; // NC venta, ND venta, NC compra, ND compra
  if (tiposConAsociado.includes(tipo)) {
    if (!c.comprobanteAsociadoNumero) {
      errors.push({
        codigo: "V-017",
        mensaje: "El número del comprobante asociado es obligatorio para notas de crédito/débito.",
        severidad: "BLOQ",
        campo: "comprobanteAsociadoNumero",
      });
    }
    if (!c.comprobanteAsociadoTimbrado) {
      errors.push({
        codigo: "V-017",
        mensaje: "El timbrado del comprobante asociado es obligatorio para notas de crédito/débito.",
        severidad: "BLOQ",
        campo: "comprobanteAsociadoTimbrado",
      });
    }
  }

  // C-001: IVA 10 coherencia — ADV
  const iva10 = toNumber(c.iva10);
  if (gravado10 > 0 && iva10 > 0) {
    const iva10Esperado = Math.round(gravado10 / 11);
    if (Math.abs(iva10 - iva10Esperado) > 1) {
      errors.push({
        codigo: "C-001",
        mensaje: `IVA 10% informado (${iva10.toLocaleString("es-PY")}) difiere del calculado (${iva10Esperado.toLocaleString("es-PY")} = gravado÷11). Verificar.`,
        severidad: "ADV",
        campo: "iva10",
      });
    }
  }

  // C-002: IVA 5 coherencia — ADV
  const iva5 = toNumber(c.iva5);
  if (gravado5 > 0 && iva5 > 0) {
    const iva5Esperado = Math.round(gravado5 / 21);
    if (Math.abs(iva5 - iva5Esperado) > 1) {
      errors.push({
        codigo: "C-002",
        mensaje: `IVA 5% informado (${iva5.toLocaleString("es-PY")}) difiere del calculado (${iva5Esperado.toLocaleString("es-PY")} = gravado÷21). Verificar.`,
        severidad: "ADV",
        campo: "iva5",
      });
    }
  }

  // C-004: Montos deben ser enteros (PYG no tiene decimales) — BLOQ
  const montosCheck = [
    { campo: "montoGravado10", valor: gravado10 },
    { campo: "montoGravado5", valor: gravado5 },
    { campo: "exento", valor: exento },
    { campo: "total", valor: total },
    { campo: "iva10", valor: iva10 },
    { campo: "iva5", valor: iva5 },
  ];
  for (const { campo, valor } of montosCheck) {
    if (!Number.isInteger(valor)) {
      errors.push({
        codigo: "C-004",
        mensaje: `El campo "${campo}" debe ser un monto entero (el guaraní no tiene decimales).`,
        severidad: "BLOQ",
        campo,
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
