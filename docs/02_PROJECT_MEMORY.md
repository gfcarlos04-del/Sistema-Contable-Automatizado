# PROJECT_MEMORY.md — Memoria viva del proyecto

> Este archivo se actualiza cada vez que se toma una decisión importante o se
> modifica el diseño. NO es un changelog cronológico (eso vive en
> `03_PROJECT_LOG.md`). Aquí queda el **estado actual** de las decisiones.

---

## 1. Identidad del proyecto

- **Nombre provisional:** Registro de Comprobantes Marangatu (sin nombre comercial todavía).
- **Dueño:** contador titular (gfcarlos04@gmail.com).
- **Contexto:** Paraguay, tributación SET/DNIT, sistema Marangatu.
- **Multi-cliente:** sí, obligatorio desde el día 1.

## 2. Decisiones tomadas

| # | Decisión | Justificación |
|---|----------|---------------|
| D-001 | Stack Next.js + TS + Tailwind + PostgreSQL + Prisma | Productividad, multimodal Gemini desde Node, single-process en V1. |
| D-002 | Gemini se usa solo para extracción, no para imputación tributaria | La imputación depende del régimen del cliente, no del PDF. Riesgo contable inaceptable. |
| D-003 | Aprobación humana obligatoria antes de registrar | Política conservadora; minimiza errores irreversibles. |
| D-004 | API Key de Gemini vive solo en backend, cifrada en reposo | Seguridad básica; evita fuga por DevTools. |
| D-005 | Multi-cliente desde V1, con aislamiento estricto | Es un sistema contable: mezclar clientes es inaceptable. |
| D-006 | Catálogos (Tablas 1 a 5 de la SET) en base de datos versionada, no hardcoded | La SET cambia tablas periódicamente. |
| D-007 | Tres exportaciones: ZIP-Marangatu, Planilla-XLSX, Libros contables XLSX | Es lo que la documentación oficial publica como formatos. |
| D-008 | Estados del comprobante con auditoría inmutable | Cumplir trazabilidad contable. |
| D-009 | Detección de duplicados con `(cliente, ruc_emisor, timbrado, número, fecha)` | Clave natural del comprobante. |
| D-010 | ~~Single-user en V1~~ → **Multi-usuario con roles desde V1** (Admin + Operador) | Definido por el usuario el 2026-05-13. |
| D-011 | **SaaS multi-tenant en la nube** (no local, no VPS propio) | Definido por el usuario el 2026-05-13. Implica entidad `organizacion` por encima de `cliente`. |
| D-012 | **Soportar los 3 regímenes** (IVA, IVA+IRE, IRP-RSP puro) desde V1 | Definido por el usuario el 2026-05-13. Requiere los 3 exportadores Excel. |
| D-013 | **Volumen alto** asumido; cola robusta (BullMQ + Redis) en lugar de pg-boss | Definido por el usuario el 2026-05-13. |
| D-014 | **Consolidar e-Kuatia (XML)** en libros contables internos, pero **NO** incluirlo en el archivo de importación a Marangatu | La SET prohíbe incluir e-Kuatia en el ZIP. Pero el usuario quiere verlos junto a los manuales en sus libros. Cumple ambas reglas. |
| D-015 | **Hosting: Fly.io (web + worker) + Neon (DB) + Cloudflare R2 (archivos) + Upstash Redis (cola)** (definido 2026-05-16, ajustes 2026-05-17 cambiando Supabase→Neon y Vercel→Fly.io). Postgres unificado en Neon. Fly.io permite correr web Next.js + worker BullMQ en la misma app sin partir el deploy. Región `gru` (São Paulo) por latencia con PY. | Stack free-tier friendly. Fly.io evita las limitaciones de serverless con procesos long-running (worker BullMQ). Neon ofrece branching nativo. |
| D-016 | **bcryptjs** en vez de argon2 (definido 2026-05-16). | argon2 requiere bindings nativos problemáticos en Windows; bcryptjs es puro JS. Costo: bcrypt es ligeramente más débil que argon2id, pero suficiente con 12 rounds. Revisable si surge presión de seguridad. |

## 3. Reglas detectadas en el Excel modelo Marangatu (planilla de importación)

Las cuatro hojas tienen cabecera en la **fila 10**. Datos desde la fila 11.

- **VENTAS** (19 columnas): tipo registro=1; identifica comprador; admite
  imputación a IVA/IRE/IRP-RSP; admite comprobantes asociados (NC/ND).
- **COMPRAS** (20 columnas): tipo registro=2; identifica proveedor; agrega
  columna "NO IMPUTA"; admite asociados (NC/ND).
- **INGRESOS** (15 columnas): tipo registro=3; sin condición de venta; sin
  monto gravado 5%/10% separados, solo `MONTO GRAVADO` y `NO GRAVADO/EXONERADO`.
- **EGRESOS** (18 columnas): tipo registro=4; sin gravado por tramos; agrega
  cuenta/tarjeta, banco, identificación IPS.

## 4. Reglas detectadas en la Especificación Técnica (PDF, junio/2021)

- Archivo CSV/TXT en UTF-8, comprimido en ZIP del mismo nombre.
- Nombre: `<RUC>_REG_MMAAAA_XXXXX.zip` (obligación 955 mensual) o
  `<RUC>_REG_AAAA_XXXXX.zip` (obligación 956 anual).
- RUC sin dígito verificador.
- Máximo 5.000 filas por archivo.
- Separador permitido: `;` para CSV o `\t` para TXT.
- Sin cabecera.
- Montos enteros, sin decimales, separador de miles `.` opcional.
- `total = gravado_10 + gravado_5 + exento` salvo excepciones tipificadas.
- Fecha mínima 01/01/2021 (excepto crédito).
- Liquidación de salario (208) y Extracto IPS (206): fecha `mm/aaaa`.

### Tablas de códigos vigentes (junio/2021)

- **Tabla 1 — Tipo de registro:** 1=VENTAS, 2=COMPRAS, 3=INGRESOS, 4=EGRESOS.
- **Tabla 2 — Condición:** 1=CONTADO, 2=CRÉDITO.
- **Tabla 3 — Identificación:** 11=RUC, 12=CI, 13=PASAPORTE, 14=CI Extranjero,
  15=SIN NOMBRE, 16=DIPLOMÁTICO, 17=Identificación Tributaria.
- **Tabla 4 — Tipos de comprobante:** 101–112 (operativos) y 201–211
  (especiales). Detalle en `04_ANALISIS_EXCEL.md`.
- **Tabla 5 — Booleanos:** S=SI, N=NO.

## 5. Reglas detectadas en los libros contables auxiliares

### Libro IVA / IVA+IRE (`Modelo de Libro ventas, ingresos, compras, egresos…`)

- Cabeceras VENTAS-INGRESOS fila 11: Tipo Id, RUC/Id, Razón Social,
  Organismo Internacional, Tipo Comprobante, Timbrado, Número, Fecha, Importe
  Total, Exenta, Total gravadas 5% (IVA incluido), IVA 5%, Total gravadas 10%
  (IVA incluido), IVA 10%, Total Importe sin IVA, Ingreso gravado IRP.
- Cabeceras COMPRAS-EGRESOS fila 11: similar pero agrega Condición y separa
  "Egreso deducible IRP" y "Egreso deducible IRE SIMPLE".
- Cabecera del libro (filas 6-8): RUC informante, Razón social, Ejercicio fiscal.
- IVA 5% se calcula como `total_gravado_5 / 21` (ya que es IVA incluido).
- IVA 10% se calcula como `total_gravado_10 / 11`.

### Libro IRP puro (`Modelo de Libro ingreso y egreso… IRP`)

- INGRESOS: Tipo Id, RUC/Id, Razón Social, Tipo Comprobante, Número, Fecha o
  mes, Importe Total, Ingreso gravado IRP, Ingreso no gravado/exonerado IRP.
- EGRESOS: Tipo Id, RUC/Id, Razón Social, Tipo Comprobante, Timbrado, Número,
  Condición, Fecha, Importe Total, Egreso deducible IRP.

## 6. Campos obligatorios (síntesis)

| Campo | VENTAS | COMPRAS | INGRESOS | EGRESOS |
|---|---|---|---|---|
| Tipo registro | sí | sí | sí | sí |
| Tipo identificación | sí | sí | sí | condicional |
| Número identificación | sí | sí | sí | condicional |
| Nombre/Razón social | si tipo ≠ 11,12,15 | si tipo ≠ 11,12 | si tipo ≠ 11,12 | si tipo ≠ 11,12 |
| Tipo comprobante | sí | sí | sí | sí |
| Fecha | sí | sí | sí | sí |
| Timbrado | sí | sí (no para 107) | n/a | n/a |
| Número comprobante | sí (no 112/106) | sí (no 112/106/107) | sí (no 208) | condicional |
| Gravado 10% | sí | sí (no 101/112/104/105) | n/a | n/a |
| Gravado 5% | sí | sí (no 101/112/104/105) | n/a | n/a |
| Exento | sí | sí | n/a | n/a |
| Total | sí | sí | sí | sí |
| Condición | si 109 | si 109 | n/a | n/a |
| Moneda extranjera | no (default N) | no (default N) | n/a | n/a |
| Imputa IVA | sí | sí | n/a | sí |
| Imputa IRE | sí | sí | sí | sí |
| Imputa IRP-RSP | sí | sí | sí | sí |
| NO IMPUTA | n/a | sí | n/a | sí |
| Comprobante asociado núm | si 110/111 | si 110/111 | si 203 | si 201 |
| Timbrado asociado | si 110/111 | si 110/111 | si 203 | si 201 |
| Cuenta/Tarjeta | n/a | n/a | n/a | si 207/211 |
| Banco | n/a | n/a | n/a | si 207/211 |
| ID Empleador (IPS) | n/a | n/a | n/a | si 206 |

## 7. Criterios de validación clave

- V-001: `total = gravado10 + gravado5 + exento` (excepciones 101/112/104/105
  en COMPRAS).
- V-002: RUC sin DV, longitud razonable (1–8 dígitos antes del DV).
- V-003: Timbrado = exactamente 8 dígitos (excepto 107 = `0`).
- V-004: Número = `^\d{3}-\d{3}-\d{7}$` o vacío (según tipo).
- V-005: Fecha = `^\d{2}/\d{2}/\d{4}$` y ≥ 01/01/2021 (salvo crédito) o
  `^\d{2}/\d{4}$` para 208/206.
- V-006: Imputación: al menos una de IVA/IRE/IRP-RSP = "S".
- V-007: Si `NO IMPUTA = S`, debe haber al menos una imputación adicional.
- V-008: Tipo de comprobante ∈ tabla 4 y permitido para el tipo de registro.
- V-009: Condición ∈ {1,2}.
- V-010: Moneda extranjera ∈ {S,N}.
- V-011: Tipo identificación ∈ tabla 3.
- V-012: Duplicado por `(cliente, ruc_emisor_sin_dv, timbrado, numero, fecha)`.

## 8. Supuestos vigentes

(Idénticos a los del SDD; aquí se mantienen para referencia rápida.)

- S1. El usuario conoce el régimen tributario de cada cliente.
- S2. No se importan comprobantes e-Kuatia.
- S3. No hay API pública de la SET; salida = ZIP.
- S4. Tablas de códigos de junio/2021 vigentes.
- S5. API Key Gemini disponible.

## 9. Dudas abiertas

### Resueltas el 2026-05-13

- DQ-001 ✅ **Multi-usuario con roles** (Admin + Operador). Admin aprueba y
  exporta; Operador solo carga y deja pendientes.
- DQ-002 ✅ **Cloud SaaS multi-tenant.** Hosting en la nube; varias
  organizaciones pueden convivir.
- DQ-003 ✅ **Los 3 regímenes**: IVA, IVA+IRE, IRP-RSP. Cada cliente declara
  uno o más; el sistema decide qué libros generar.
- DQ-004 (implícita) → El RUC informante es del **cliente** del estudio, no
  del estudio en sí. El estudio (organización) sólo agrupa clientes.
- DQ-005 ✅ **Volumen alto** asumido como tope de diseño (>1000 comprobantes/
  mes/cliente). Implica cola con Redis y plan de presupuesto Gemini.
- DQ-006 ✅ **Sí, importar XML e-Kuatia** para consolidar en libros internos,
  pero NO exportarlos en el ZIP de Marangatu (la SET no lo permite).

### Pendientes (no bloqueantes para empezar Fase 0)

- DQ-007: ¿UI en guaraní además de español? Asumido: solo español por ahora.
- DQ-008: Hosting concreto (Vercel + Supabase + Cloudflare R2 vs Fly.io +
  Neon vs AWS). Decidir antes de Fase 4.
- DQ-009: ¿Integración con Google Drive (carpetas por cliente)? Quedar como
  V2 si no es crítico.
- DQ-010: ¿Estrategia de facturación del SaaS al cliente final (por usuario,
  por organización, por volumen)? V2.
- DQ-011: ¿Requisitos legales paraguayos de tratamiento de datos personales /
  contables almacenados en cloud extranjera? **Importante de revisar.**

## 10. Cambios en arquitectura / modelo / interfaz

(vacío al inicio; se registra cada cambio aquí)

## 11. Historial de decisiones relevantes

Ver `03_PROJECT_LOG.md` para detalle cronológico.
