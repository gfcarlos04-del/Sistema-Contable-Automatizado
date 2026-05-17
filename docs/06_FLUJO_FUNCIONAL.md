# Flujo funcional

## Pantallas previstas

1. **Login** (V1 mínimo, single-user).
2. **Dashboard general** — resumen del cliente seleccionado: comprobantes
   pendientes, en revisión, registrados del mes, último error, accesos
   rápidos.
3. **Selección de cliente** (modal global; siempre visible en el header).
4. **Gestión de clientes** — listado, alta, edición, régimen, RUC informante.
5. **Carga de comprobantes** — drop-zone, lote o uno a uno, indica el cliente
   activo.
6. **Cola de procesamiento** — comprobantes en estado `EXTRAYENDO` o
   `EXTRAIDO` esperando revisión.
7. **Revisión / aprobación** — pantalla split: documento original (visor con
   zoom/rotación/páginas) a la izquierda, panel de campos a la derecha con
   nivel de confianza por campo, advertencias y acciones.
8. **Historial de comprobantes** — tabla filtrable por estado, período,
   contraparte; export CSV interno.
9. **Exportación a Marangatu** — selector de período + obligación (955 o
   956) + tipos de registro a incluir; genera ZIP.
10. **Exportación a libros contables** — selector de libro + ejercicio.
11. **Configuración** — API Key Gemini, modelo, parámetros de confianza.
12. **Auditoría** — log de cambios filtrable.

## Flujo detallado

### 1. Selección de cliente

- Al loguearse, el header muestra el cliente activo o el botón "Seleccionar
  cliente".
- Sin cliente activo, las pantallas de Carga / Revisión / Exportación están
  deshabilitadas.
- Acción **Crear cliente**: razón social, RUC sin DV (el sistema calcula DV),
  régimen (IVA, IRE, IRE_SIMPLE, IRP_RSP).
- **Ver historial** del cliente: enlace directo al historial filtrado.

### 2. Carga del comprobante

- Drag-and-drop o file picker.
- Acepta PDF, JPG, PNG, HEIC, WEBP. Máx 25 MB.
- Antes de subir, se calcula hash; si ya existe para el cliente, advertencia
  "Este archivo ya fue cargado" con enlace al comprobante existente.
- Tras subir, el comprobante queda en `CARGADO` y se encola para extracción.

### 3. Visor del comprobante

- Reutiliza PDF.js (también renderiza imágenes via canvas).
- Controles: zoom +/−, ajustar al ancho, rotación 90°, navegación páginas.
- Sincronización con campos: al hacer hover sobre un campo del panel, si
  Gemini devolvió `bbox`, se resalta la región correspondiente.

### 4. Extracción con Gemini

- Worker en backend toma el comprobante en `CARGADO`, marca `EXTRAYENDO`,
  envía a Gemini con el prompt de `08_PROMPT_GEMINI.md`, parsea JSON.
- Guarda cada campo en `campo_extraido` con su confianza.
- Marca el comprobante en `EXTRAIDO`.
- Si falla 3 veces: estado `REQUIERE_REVISION_MANUAL`.

### 5. Validación

- Motor de validación (`09_VALIDACIONES.md`) corre tras la extracción y tras
  cada edición manual. Recalcula:
  - Suma de montos.
  - Formatos (RUC, timbrado, número, fecha).
  - Coherencia tipo de comprobante ↔ tipo de registro.
  - Imputación.
  - Duplicado.
- Resultado: lista de `errores` (bloqueantes) y `advertencias` (no
  bloqueantes).

### 6. Revisión / aprobación

Panel derecho organizado por bloques:

- **Identificación de la contraparte** (tipo, número, nombre).
- **Datos del comprobante** (tipo, fecha, timbrado, número).
- **Montos** (gravado 10, gravado 5, exento, total) + IVA calculado.
- **Condición y moneda**.
- **Imputación tributaria** (definida por el usuario; el sistema sugiere en
  base al régimen del cliente pero no decide).
- **Asociados / extras** (NC, ND, IPS, banco, etc., según tipo).

Cada campo muestra:

- Valor editable.
- Badge de confianza (alta/media/baja).
- Tooltip con valor original extraído por Gemini (si difiere).
- Observación si la hay.

Botones:

- **Aprobar y registrar** (deshabilitado si hay errores bloqueantes).
- **Guardar como pendiente**.
- **Rechazar comprobante** (pide motivo).
- **Corregir y volver a extraer** (re-envía a Gemini con instrucción de foco
  en campos dudosos).

### 7. Registro final

Tras aprobar, el comprobante pasa a `REGISTRADO`. Se guardan:

- Cliente.
- Archivo original (inmutable).
- Datos extraídos (en `campo_extraido.valor_extraido`).
- Datos corregidos (`campo_extraido.valor_final` y columnas en `comprobante`).
- Usuario que aprobó, fecha, confianza general original.
- Lista de cambios manuales en `auditoria_cambio`.

### 8. Exportación

- Selector: cliente + período (mensual o anual) + tipos de registro a
  incluir.
- El sistema arma uno o varios archivos según el límite de 5.000 filas.
- Genera ZIP con CSV (o TXT) UTF-8.
- Nombre del archivo: `<RUC>_REG_MMAAAA_XXXXX.zip` (autoincremento del
  `XXXXX`).
- Guarda registro en `exportacion` con hash.
- Paralelamente, puede generar Excel modelo para revisión visual.

## Comportamiento ante baja confianza

- Confianza < 70% en cualquier campo crítico ⇒ "Aprobar y registrar"
  deshabilitado hasta que el usuario haga clic explícito en "Confirmar
  manualmente" sobre ese campo (queda registrado en auditoría).
- Confianza general < 70% ⇒ banner rojo en la parte superior con texto:
  "Este comprobante requiere revisión cuidadosa antes de registrar".
