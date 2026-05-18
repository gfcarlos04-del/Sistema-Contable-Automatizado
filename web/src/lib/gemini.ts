import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";

// ── Types ─────────────────────────────────────────────────────────────────

export interface GeminiField {
  value: string | number | null;
  confidence: number;
  status: "CONFIABLE" | "DUDOSO" | "FALTANTE" | "REQUIERE_REVISION";
  observation: string | null;
  bbox: { page: number; x: number; y: number; w: number; h: number } | null;
}

export interface GeminiResponse {
  document_type: string | null;
  general_confidence: number;
  fields: {
    ruc_emisor: GeminiField;
    dv_emisor: GeminiField;
    nombre_emisor: GeminiField;
    ruc_receptor: GeminiField;
    dv_receptor: GeminiField;
    nombre_receptor: GeminiField;
    timbrado: GeminiField;
    numero_comprobante: GeminiField;
    fecha_emision: GeminiField;
    moneda: GeminiField;
    condicion_operacion: GeminiField;
    monto_gravado_10_iva_incluido: GeminiField;
    iva_10: GeminiField;
    monto_gravado_5_iva_incluido: GeminiField;
    iva_5: GeminiField;
    exento: GeminiField;
    total: GeminiField;
    concepto: GeminiField;
    comprobante_asociado_numero: GeminiField;
    comprobante_asociado_timbrado: GeminiField;
  };
  warnings: string[];
  requires_manual_review: boolean;
}

// ── Document type mapping ─────────────────────────────────────────────────

const DOC_TYPE_TO_CODIGO: Record<string, number> = {
  FACTURA: 109,
  AUTOFACTURA: 101,
  BOLETA_VENTA: 103,
  NOTA_CREDITO: 110,
  NOTA_DEBITO: 111,
  TICKET: 112,
  BOLETA_TRANSPORTE: 102,
  DESPACHO_IMPORTACION: 107,
  ENTRADA_ESPECTACULO: 108,
  COMPROBANTE_RETENCION: 201,
  LIQUIDACION_SALARIO: 208,
  EXTRACTO_IPS: 206,
};

export function mapDocType(docType: string | null): number {
  if (!docType) return 0;
  return DOC_TYPE_TO_CODIGO[docType.toUpperCase()] ?? 0;
}

// ── API key helper ────────────────────────────────────────────────────────

export async function getGeminiApiKey(organizacionId: string): Promise<string> {
  // Try org-specific key first (encrypted in ConfiguracionOrg)
  const config = await prisma.configuracionOrg.findUnique({
    where: { organizacionId_clave: { organizacionId, clave: "GEMINI_API_KEY" } },
  });

  if (config?.valorCifrado) {
    return decryptString(Buffer.from(config.valorCifrado));
  }
  if (config?.valor) {
    return config.valor;
  }

  // Fall back to env var
  const envKey = process.env.GEMINI_API_KEY;
  if (!envKey) {
    throw new Error("GEMINI_API_KEY no configurada para la organización ni en el entorno.");
  }
  return envKey;
}

// ── Prompt ───────────────────────────────────────────────────────────────

const GEMINI_PROMPT = `Sos un asistente especializado en extracción de datos de comprobantes fiscales paraguayos para el Sistema Marangatu (SET/DNIT Paraguay).

Analizá el comprobante adjunto y extraé los datos en el formato JSON estricto indicado.

REGLAS:
- Extraé los datos EXACTAMENTE como aparecen en el documento, sin interpretar ni inferir.
- Si un campo no es visible o no existe en el documento, usar value: null con status: "FALTANTE".
- Si hay dudas sobre la lectura, usar status: "DUDOSO" con confianza < 70.
- Calibrá la confianza honestamente: 90-100=claramente legible, 70-89=alguna duda, 0-69=difícil o inferido.
- NO determines las imputaciones tributarias (IVA/IRE/IRP-RSP/NO IMPUTA). No las incluyas.
- Para numero_comprobante: extraé exactamente como aparece. El sistema normaliza el formato.
- Para ruc_emisor: si aparece con DV (ej: "80024627-1"), extraé solo el número sin DV.
- Para montos: solo dígitos enteros en guaraníes (PYG). Si es en moneda extranjera, igual extraé el valor impreso.
- document_type: uno de FACTURA, AUTOFACTURA, BOLETA_VENTA, NOTA_CREDITO, NOTA_DEBITO, TICKET, BOLETA_TRANSPORTE, DESPACHO_IMPORTACION, ENTRADA_ESPECTACULO, COMPROBANTE_RETENCION, LIQUIDACION_SALARIO, EXTRACTO_IPS, OTRO.
- condicion_operacion: "CONTADO" o "CREDITO" si aparece explícito; null si no se indica.
- Respondé SOLO con el JSON, sin texto adicional, sin markdown, sin \`\`\`json.

Devolvé este JSON exacto (con todos los campos aunque sean null):
{
  "document_type": "FACTURA",
  "general_confidence": 95,
  "fields": {
    "ruc_emisor": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "dv_emisor": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "nombre_emisor": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "ruc_receptor": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "dv_receptor": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "nombre_receptor": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "timbrado": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "numero_comprobante": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "fecha_emision": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "moneda": {"value": "PYG", "confidence": 90, "status": "CONFIABLE", "observation": null, "bbox": null},
    "condicion_operacion": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "monto_gravado_10_iva_incluido": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "iva_10": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "monto_gravado_5_iva_incluido": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "iva_5": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "exento": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "total": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "concepto": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "comprobante_asociado_numero": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null},
    "comprobante_asociado_timbrado": {"value": null, "confidence": 0, "status": "FALTANTE", "observation": null, "bbox": null}
  },
  "warnings": [],
  "requires_manual_review": false
}`;

// ── Extractor ─────────────────────────────────────────────────────────────

export async function extraerComprobante(params: {
  buffer: Buffer;
  mime: string;
  modelo: string;
  apiKey: string;
}): Promise<GeminiResponse> {
  const { buffer, mime, modelo, apiKey } = params;

  const ai = new GoogleGenAI({ apiKey });

  const base64Data = buffer.toString("base64");

  const result = await ai.models.generateContent({
    model: modelo,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mime,
              data: base64Data,
            },
          },
          { text: GEMINI_PROMPT },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0,
    },
  });

  const text = result.text ?? "";

  let parsed: GeminiResponse;
  try {
    parsed = JSON.parse(text) as GeminiResponse;
  } catch {
    throw new Error(`Gemini devolvió JSON inválido: ${text.slice(0, 200)}`);
  }

  return parsed;
}
