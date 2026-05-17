# Prompt interno para Gemini

## Política

- **No inventar.** Si un dato no aparece o no se lee con seguridad → `null` +
  `status: "FALTANTE"`.
- **Confianza honesta.** Calibrar entre 0 y 100. Un valor con confianza 95
  debe ser realmente legible y verificable.
- **JSON estricto.** Sin texto fuera del JSON, sin Markdown, sin comentarios.
- **No imputar.** Gemini no determina IVA/IRE/IRP-RSP/NO IMPUTA.
- **No traducir códigos.** Devolver el texto original de la factura para
  campos como "Tipo de comprobante" y "Condición"; el backend lo mapea a los
  códigos oficiales.

## System prompt (versión 1)

```
Eres un asistente especializado en extraer datos de comprobantes tributarios
de Paraguay (facturas, boletas, autofacturas, notas de crédito, notas de
débito, tickets, despachos de importación, liquidaciones, extractos).

Tu única tarea es EXTRAER datos visibles en el documento. NUNCA debes:
- Inventar o asumir datos que no estén visibles.
- Calcular IVA si no aparece explícito (puedes detectarlo si está impreso).
- Decidir imputaciones tributarias (IVA / IRE / IRP-RSP / NO IMPUTA).
- Traducir códigos.

Devuelve EXCLUSIVAMENTE un objeto JSON con la estructura indicada. No
incluyas texto antes ni después. No uses bloques de código Markdown.

Si un dato no es visible o no se lee con certeza, usa null y marca status
como "FALTANTE" o "REQUIERE_REVISION".

La moneda paraguaya (PYG, Gs.) usa el punto como separador de miles y no
suele tener decimales. Si ves "1.500.000" es un millón quinientos mil.

Para el campo "numero_comprobante", el formato típico es ###-###-#######
(ejemplo: 001-001-0000123). Si el documento muestra "Nº 0000123" sin los
prefijos, devuélvelo tal cual lo veas y deja una observación.

Para el RUC paraguayo, devuelve el número COMPLETO tal como aparece en el
documento, incluyendo dígito verificador si está presente (el backend lo
separa). Ejemplo: "80024627-1".

Calibra la confianza honestamente:
- 90-100: el dato es claramente legible y no hay ambigüedad.
- 70-89: el dato es legible pero hay alguna duda (carácter borroso, parecido).
- 0-69: el dato es difícil de leer o se está infiriendo.
- null + FALTANTE: el dato no aparece.
```

## Schema de salida (estructura obligatoria)

```json
{
  "document_type": "FACTURA | BOLETA_VENTA | AUTOFACTURA | NOTA_CREDITO | NOTA_DEBITO | TICKET_MAQ_REGISTRADORA | DESPACHO_IMPORTACION | LIQUIDACION_SALARIO | EXTRACTO_IPS | EXTRACTO_TCTD | TRANSFERENCIA | OTRO | DESCONOCIDO",
  "general_confidence": 0,
  "fields": {
    "ruc_emisor": {
      "value": null,
      "confidence": 0,
      "status": "CONFIABLE | DUDOSO | FALTANTE | REQUIERE_REVISION",
      "observation": null,
      "bbox": null
    },
    "dv_emisor": { "value": null, "confidence": 0, "status": "..." },
    "nombre_emisor": { "value": null, "confidence": 0, "status": "..." },
    "ruc_receptor": { "value": null, "confidence": 0, "status": "..." },
    "dv_receptor": { "value": null, "confidence": 0, "status": "..." },
    "nombre_receptor": { "value": null, "confidence": 0, "status": "..." },
    "timbrado": { "value": null, "confidence": 0, "status": "..." },
    "numero_comprobante": { "value": null, "confidence": 0, "status": "..." },
    "fecha_emision": { "value": null, "confidence": 0, "status": "..." },
    "moneda": { "value": null, "confidence": 0, "status": "..." },
    "condicion_operacion": { "value": "CONTADO | CREDITO | null", "confidence": 0, "status": "..." },
    "monto_gravado_10_iva_incluido": { "value": null, "confidence": 0, "status": "..." },
    "iva_10": { "value": null, "confidence": 0, "status": "..." },
    "monto_gravado_5_iva_incluido": { "value": null, "confidence": 0, "status": "..." },
    "iva_5": { "value": null, "confidence": 0, "status": "..." },
    "exento": { "value": null, "confidence": 0, "status": "..." },
    "total": { "value": null, "confidence": 0, "status": "..." },
    "concepto": { "value": null, "confidence": 0, "status": "..." },
    "comprobante_asociado_numero": { "value": null, "confidence": 0, "status": "..." },
    "comprobante_asociado_timbrado": { "value": null, "confidence": 0, "status": "..." }
  },
  "warnings": [
    "Lista de advertencias humanas legibles sobre problemas de lectura"
  ],
  "requires_manual_review": true
}
```

Donde `bbox` es opcional `{ "page": 1, "x": 0.12, "y": 0.34, "w": 0.20, "h": 0.04 }`
en coordenadas normalizadas 0..1.

## Reglas adicionales de parseo (backend)

- Si Gemini devuelve `numero_comprobante` sin guiones, el backend intenta
  normalizar a `###-###-#######` con ceros a la izquierda.
- Si Gemini devuelve `ruc_emisor` con DV adjunto (`80024627-1`), el backend
  separa en `ruc` (8 dígitos sin DV) y `dv` (1 dígito).
- Si `iva_10` viene null pero `monto_gravado_10_iva_incluido` no, el sistema
  calcula `iva_10 = round(monto_gravado_10_iva_incluido / 11)` y lo marca
  como "calculado".
- Si la suma `gravado_10 + gravado_5 + exento` no coincide con `total` con
  tolerancia de Gs. 2, se emite advertencia.

## Configuración de la llamada

- `model`: `gemini-2.5-pro` (default) o `gemini-2.5-flash` (configurable).
- `response_mime_type`: `application/json`.
- `response_schema`: el schema anterior, expresado en formato JSON Schema.
- `temperature`: 0 (queremos determinismo).
- `safety_settings`: estándar.

## Prompt de "re-extracción enfocada"

Cuando el usuario solicita re-extraer con foco, se agrega al user message:

```
Re-examina específicamente los siguientes campos, que tuvieron confianza
baja en la extracción anterior: <lista>. Indica explícitamente si no son
legibles.
```
