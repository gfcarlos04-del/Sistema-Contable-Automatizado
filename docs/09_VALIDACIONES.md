# Validaciones contables y técnicas

Las reglas marcadas como **BLOQ** impiden registrar el comprobante. Las **ADV**
son advertencias visibles pero no bloqueantes.

## A. Estructura

| ID | Regla | Severidad | Aplica a |
|---|---|---|---|
| V-001 | `total = gravado_10 + gravado_5 + exento` (tolerancia ±2 Gs) | BLOQ | VENTAS y COMPRAS, excepto 101/104/105/112 (solo en COMPRAS) |
| V-002 | RUC sin DV: solo dígitos, longitud 1–8 | BLOQ | Todos |
| V-003 | DV: dígito 0–9; coincide con cálculo módulo 11 de la SET | ADV | Todos |
| V-004 | Timbrado: 8 dígitos numéricos | BLOQ | Todos excepto tipo 107 (=0) |
| V-005 | Número comprobante: `^\d{3}-\d{3}-\d{7}$` | BLOQ | Todos excepto 106, 112, 107, 208, 205, 206, 207 |
| V-006 | Fecha: `^\d{2}/\d{2}/\d{4}$` ≥ 01/01/2021 (excepto crédito) | BLOQ | Todos los tipos excepto 208/206 |
| V-007 | Fecha período: `^\d{2}/\d{4}$` ≥ 01/2021 | BLOQ | 208 (Liq. salario), 206 (Extracto IPS) |
| V-008 | Condición ∈ {1,2} | BLOQ | Solo tipo 109 (Factura) |
| V-009 | Moneda extranjera ∈ {S,N} | BLOQ | Todos |
| V-010 | Tipo identificación ∈ tabla 3 | BLOQ | Todos |
| V-011 | Tipo comprobante ∈ tabla 4 y permitido para el tipo de registro | BLOQ | Todos |
| V-012 | Nombre obligatorio si tipo id no ∈ {11,12,15} (ventas) o no ∈ {11,12} (compras/ingresos/egresos) | BLOQ | Según tipo de registro |
| V-013 | IMPUTA_IVA, IMPUTA_IRE, IMPUTA_IRP_RSP ∈ {S,N} | BLOQ | Todos los aplicables |
| V-014 | Al menos una imputación = "S" | BLOQ | Todos |
| V-015 | Si NO_IMPUTA = "S", debe haber al menos una imputación adicional | BLOQ | COMPRAS, EGRESOS |
| V-016 | Régimen del cliente debe permitir la imputación elegida | BLOQ | Todos |
| V-017 | Comprobante asociado núm requerido | BLOQ | Tipos 110, 111 (NC/ND), 203, 201 |
| V-018 | Comprobante asociado timbrado requerido | BLOQ | Mismos |
| V-019 | Para 101/104/105/112 en COMPRAS: gravado_10 = gravado_5 = exento = 0 y total > 0 | BLOQ | COMPRAS |
| V-020 | Para 209 (Otros egresos) o 210 (Otros ingresos): "Especificar tipo documento" requerido | BLOQ | INGRESOS/EGRESOS |
| V-021 | Para 207 / 211: nro de cuenta/tarjeta + banco requeridos | BLOQ | EGRESOS |
| V-022 | Para 206: identificador del empleador requerido | BLOQ | EGRESOS |

## B. Coherencia

| ID | Regla | Severidad |
|---|---|---|
| C-001 | `iva_10 ≈ gravado_10_iva_incluido / 11` (tolerancia 1) | ADV |
| C-002 | `iva_5 ≈ gravado_5_iva_incluido / 21` (tolerancia 1) | ADV |
| C-003 | Total > 0 | BLOQ |
| C-004 | Montos enteros sin decimales (PYG) | BLOQ |
| C-005 | Si moneda extranjera "S", se requiere moneda original + tipo cambio (en libros internos) | ADV |
| C-006 | Fecha emisión no futura | BLOQ |
| C-007 | Fecha emisión dentro del ejercicio fiscal seleccionado al exportar | BLOQ al exportar |

## C. Duplicados

| ID | Regla |
|---|---|
| D-001 | Hash SHA-256 del archivo ya cargado en el mismo cliente → advertencia con enlace |
| D-002 | Clave `(cliente, ruc_emisor_sin_dv, timbrado, numero, fecha)` ya existe → BLOQ; permite forzar registro con motivo escrito |

## D. Confianza

| ID | Regla |
|---|---|
| K-001 | Campo crítico con confianza < 70 → BLOQ hasta confirmación manual |
| K-002 | Confianza general < 70 → banner rojo; cada campo crítico requiere confirmación individual |
| K-003 | Cualquier edición manual cambia status del campo a `EDITADO_MANUALMENTE` y se registra en auditoría |

## E. Lista de campos críticos

- RUC emisor (contraparte)
- Timbrado
- Número de comprobante
- Fecha de emisión
- Tipo de comprobante
- Total
- IVA 10% / IVA 5% / Gravado 10 / Gravado 5 / Exento
- Cliente al que se imputa (se confirma al cargar)
- Imputación tributaria

## F. Pre-exportación

Antes de generar el ZIP de Marangatu:

1. Todos los comprobantes del lote deben estar `REGISTRADO`.
2. Todos pertenecen al mismo cliente y al mismo período (mensual o anual).
3. Ninguno excede 5.000 filas por archivo (paginar si excede).
4. El RUC informante (cliente) está configurado.
5. Re-correr todas las validaciones del bloque A antes de escribir el archivo
   (defensa en profundidad).
6. Si alguna validación falla → mostrar lista de comprobantes problemáticos y
   no escribir el archivo.
