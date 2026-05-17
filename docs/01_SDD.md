# SDD — Software Design Document
**Proyecto:** Registro de Comprobantes — Marangatu/DNIT Paraguay
**Versión:** 0.1 (borrador inicial, pendiente de aprobación)
**Fecha:** 2026-05-13

---

## 1. Objetivo general

Construir una aplicación web que permita a un contador (o equipo contable)
cargar comprobantes físicos/PDF/imagen de múltiples clientes, extraer sus datos
mediante Gemini, validarlos, aprobarlos manualmente y exportarlos en los
formatos oficiales del Sistema Marangatu de la SET/DNIT de Paraguay y en los
libros contables auxiliares publicados por la SET.

## 2. Alcance funcional

Incluido:

- Gestión de clientes (CRUD, RUC informante, régimen tributario).
- Carga de comprobantes (foto, JPG/PNG, PDF digital, PDF escaneado).
- Visor de documento con zoom, rotación y navegación de páginas.
- Extracción asistida con Gemini (multimodal).
- Sistema de confianza por campo y confianza general del documento.
- Pantalla de revisión y aprobación humana.
- Validaciones según Especificación Técnica de la SET (junio/2021).
- Detección de duplicados.
- Registro definitivo, historial y auditoría.
- Exportación a:
  - CSV/TXT en ZIP con el nombre que exige Marangatu.
  - Excel "Planilla para Registro de Comprobantes en Marangatu" (4 hojas).
  - Excel "Libro de Ventas, Ingresos, Compras, Egresos" (IVA o IVA+IRE).
  - Excel "Libro de Ingresos y Egresos" (solo IRP).

Excluido (V1):

- Integración directa con la API de Marangatu (no es pública para terceros).
- Liquidación o cálculo de impuestos.
- Generación de declaraciones juradas.
- Facturación al cliente final del SaaS.

Incluido en V1 con matiz:

- **e-Kuatia (XML).** Se permite importar XML para consolidar en los libros
  contables internos (Libro IVA, Libro IRP) del cliente. **Pero estos
  comprobantes NUNCA se incluyen en el ZIP de Marangatu** — la SET prohíbe
  importar comprobantes electrónicos por esa vía porque ya están en
  Marangatu. El sistema los marca con bandera `origen = E_KUATIA` y los
  excluye automáticamente al generar el ZIP.

## 3. Alcance no funcional

- Web responsive, escritorio prioritario (uso contable real con doble monitor).
- Idioma: español (Paraguay).
- Zona horaria: America/Asuncion.
- Moneda base: PYG (guaraníes), con soporte para moneda extranjera.
- Tiempos esperados: extracción Gemini < 15 s por documento.
- Disponibilidad: uso interno; objetivo razonable 99% en horario laboral.
- Backup diario de base de datos y archivos.

## 4. Usuarios y tenancy (actualizado 2026-05-13)

Modelo **SaaS multi-tenant**:

- `Organizacion` (tenant) — un estudio contable, un contador independiente, o
  una empresa. Aísla clientes, usuarios, archivos y exportaciones.
- `Usuario` pertenece a una `Organizacion` y tiene `rol`:
  - **Admin:** crea clientes, gestiona usuarios, configura API Key Gemini,
    aprueba, registra, exporta, ve auditoría completa.
  - **Operador:** carga comprobantes, edita extracción, puede dejar en
    `PENDIENTE`. NO puede aprobar/registrar ni exportar.
- Soporta varios Admin por organización; el primer Admin se crea al
  registrar la organización.
- Aislamiento estricto: toda consulta filtra por `organizacion_id`. Los
  archivos se guardan en `storage/org/<org_id>/clientes/<cliente_id>/...`.

## 5. Flujo principal del sistema

1. Login (V1: single-user con clave local; V2: auth real).
2. Selección de cliente (obligatoria antes de cualquier carga).
3. Subir uno o varios comprobantes.
4. Para cada comprobante:
   a. Se almacena el archivo original.
   b. Se envía a Gemini con un prompt estricto (ver `08_PROMPT_GEMINI.md`).
   c. Se reciben campos extraídos con confianza por campo.
   d. Se aplican validaciones automáticas (suma de montos, formato RUC,
      timbrado, número, fecha, duplicados).
   e. Se calcula confianza general.
5. Pantalla de revisión: documento original + datos extraídos editables, con
   campos críticos resaltados y bloqueados si su confianza es baja.
6. Usuario aprueba, rechaza, deja pendiente o corrige.
7. Si aprueba: el comprobante pasa a estado **REGISTRADO** y queda disponible
   para exportación.
8. Exportación por cliente y por período (mensual para 955, anual para 956).

## 6. Arquitectura propuesta

Ver detalle en `07_ARQUITECTURA.md`. En resumen:

```
[Browser: Next.js + React + Tailwind]
        │ HTTPS
        ▼
[Next.js Route Handlers / API]
   ├── Auth & sessions
   ├── Clientes
   ├── Comprobantes (CRUD, estados)
   ├── Extracción (cola → Gemini)
   ├── Validaciones
   ├── Exportación CSV/TXT/XLSX
   └── Auditoría
        │
        ├── PostgreSQL (Prisma)
        ├── Filesystem / S3 (archivos)
        └── Gemini API (server-side)
```

Capas:

- **Presentación:** componentes React; PDF.js para visor; tablas con filtros.
- **Aplicación:** Route Handlers o servicios NestJS; orquestación de
  extracción + validación.
- **Dominio:** entidades `Cliente`, `Comprobante`, `Comprobante.Detalle`,
  `CampoExtraido`, `Auditoria`, `Exportacion`.
- **Infraestructura:** Prisma, almacenamiento de archivos, cliente Gemini.

## 7. Módulos del sistema

1. **Auth** (login local, gestión de sesión).
2. **Clientes** (alta, edición, régimen, RUC, libros aplicables).
3. **Carga** (upload, deduplicación por hash, pre-procesado).
4. **Visor** (PDF/imagen, zoom, rotación, multipágina).
5. **Extracción IA** (cola, prompt, parser de JSON estricto, retry).
6. **Validación** (reglas DNIT, suma de montos, dígitos, fechas, duplicados).
7. **Revisión** (UI de aprobación, edición campo a campo, justificación).
8. **Registro** (transición de estados, inmutabilidad de aprobados sin auditoría).
9. **Exportación** (CSV/TXT/XLSX por período y cliente).
10. **Auditoría** (log de cambios, quién, cuándo, qué).
11. **Catálogos** (Tablas 1 a 5 de la SET, versionadas).
12. **Config** (API Key Gemini, parámetros del sistema).

## 8. Modelo de datos

Detalle completo en `05_MODELO_DATOS.md`. Entidades clave:

- `Cliente` (id, razón_social, ruc, dv, régimen[], activo).
- `Comprobante` (id, cliente_id, tipo_registro, tipo_comprobante, fecha_emision,
  timbrado, numero, ruc_contraparte, dv_contraparte, nombre_contraparte,
  tipo_identificacion, monto_gravado_10, iva_10, monto_gravado_5, iva_5,
  exento, total, condicion_operacion, moneda, imputa_iva, imputa_ire,
  imputa_irp_rsp, no_imputa, comprobante_asociado_numero,
  comprobante_asociado_timbrado, estado, confianza_general, archivo_id,
  hash_archivo, creado_por, aprobado_por, aprobado_en, registrado_en).
- `CampoExtraido` (comprobante_id, campo, valor_extraido, valor_final,
  confianza, status, observacion).
- `Archivo` (id, ruta, mime, tamaño, hash_sha256, paginas).
- `AuditoriaCambio` (entidad, id_entidad, campo, valor_anterior, valor_nuevo,
  usuario_id, fecha, motivo).
- `Exportacion` (id, cliente_id, tipo, periodo, ruta_zip, registros_incluidos,
  fecha).
- `CatalogoTipoComprobante`, `CatalogoTipoIdentificacion`, `CatalogoCondicion`
  (versionados).

## 9. Integración con Gemini API

- Modelo recomendado: `gemini-2.5-pro` (multimodal con PDF). Alternativa
  económica: `gemini-2.5-flash`.
- API Key guardada **solo en backend** (variable de entorno + tabla cifrada
  para rotación).
- Llamada multimodal: se envía el archivo (PDF o imagen) + un **system prompt
  estricto** (ver `08_PROMPT_GEMINI.md`).
- Respuesta forzada a JSON estructurado (response schema o instrucción dura).
- Reintentos con backoff (3 intentos máximo). Si falla → estado
  `REQUIERE_REVISION_MANUAL`, todos los campos en blanco para carga manual.
- Timeout 60s.
- No se envían datos del comprobante a logs externos.

## 10. Manejo de archivos PDF e imágenes

- Aceptados: PDF, JPG, JPEG, PNG, HEIC (convertido), WEBP.
- Tamaño máx: 25 MB (configurable).
- PDF multipágina permitido; Gemini procesa todas las páginas si caben en el
  límite de tokens. Si excede, se rasteriza a imágenes por página.
- Cada archivo genera un hash SHA-256 para detectar reupload.
- Almacenamiento por carpeta: `storage/clientes/<cliente_id>/<año>/<mes>/`.
- PDF escaneados con baja resolución: se aplica preproceso (deskew y aumento de
  contraste con `sharp`) antes de enviar a Gemini.

## 11. Flujo de aprobación manual

Estados del comprobante:

`CARGADO → EXTRAYENDO → EXTRAIDO → EN_REVISION → REGISTRADO`
con bifurcaciones a `PENDIENTE`, `RECHAZADO`, `DUPLICADO`,
`REQUIERE_REVISION_MANUAL`.

Reglas:

- Un comprobante en `REGISTRADO` no se edita; cualquier cambio crea un nuevo
  registro de auditoría y exige motivo.
- Si la confianza general < 70%, el botón "Aprobar y registrar" se deshabilita
  hasta que el usuario edite o confirme cada campo crítico.
- Si la suma de montos no cuadra, el comprobante no puede registrarse.

## 12. Sistema de confianza por campo

- 90–100%: alta confianza (verde, editable).
- 70–89%: requiere revisión visual (amarillo, editable, advertencia).
- <70%: dudoso (rojo, editable, exige confirmación).
- null/faltante: si es campo obligatorio, bloquea registro.

Campos críticos siempre requieren confirmación humana aun con alta confianza:
RUC emisor, timbrado, número de comprobante, fecha, total, IVA, tipo de
comprobante, imputación tributaria.

## 13. Sistema multi-tenant y multi-cliente

Jerarquía: `Organizacion → Usuario` y `Organizacion → Cliente → Comprobante`.

- Antes de cualquier acción de carga o exportación, el usuario debe haber
  seleccionado un cliente de su organización (selector siempre visible).
- Toda consulta filtra por `organizacion_id` Y `cliente_id`. La autorización
  del backend bloquea acceso cruzado entre organizaciones y entre clientes.
- Archivos físicos en `storage/org/<org_id>/clientes/<cliente_id>/<año>/<mes>/`.
- Exportaciones se generan por cliente + período.
- No se permite mezclar comprobantes de distintos clientes en una exportación.
- **Aislamiento de la API Key Gemini:** cada organización configura la suya
  (cifrada). Si la organización no tiene su propia key, se usa la global del
  SaaS y se contabiliza para facturación (futuro).

## 14. Exportación a Excel y a archivo de importación

Tres formatos disponibles, conforme a los modelos oficiales de la SET:

### 14.1 Importación a Marangatu (CSV/TXT en ZIP)

Formato exigido por la Especificación Técnica de junio/2021:

- CSV delimitado por `;` (punto y coma) o TXT por tabulaciones, UTF-8.
- Sin cabeceras.
- Comprimido en ZIP del **mismo nombre**.
- Nombre: `<RUC_SIN_DV>_REG_MMAAAA_XXXXX.zip` (mensual, obligación 955)
  o `<RUC_SIN_DV>_REG_AAAA_XXXXX.zip` (anual, obligación 956).
- Máx 5.000 filas por archivo (paginación automática si se excede).
- Puede mezclar tipos 1/2/3/4 (Ventas/Compras/Ingresos/Egresos) o separarlos.
- RUC sin dígito verificador.
- Montos sin decimales, sin separador o con punto como separador de miles.

### 14.2 Planilla Excel modelo Marangatu

Se respeta la estructura exacta de las 4 hojas (`VENTAS`, `COMPRAS`,
`INGRESOS`, `EGRESOS`) tal como aparecen en el archivo de referencia. Útil
para revisión humana antes de importar.

### 14.3 Libros contables auxiliares (IVA, IVA+IRE, IRP)

- Libro `VENTAS-INGRESOS` y `COMPRAS-EGRESOS` para IVA/IRE.
- Libro `INGRESOS` y `EGRESOS` para IRP puro.
- Cabeceras: RUC informante, razón social, ejercicio fiscal.

Ver mapeo campo-a-campo en `04_ANALISIS_EXCEL.md`.

## 15. Reglas de validación

Detalle completo en `09_VALIDACIONES.md`. Reglas duras:

- `total = gravado_10 + gravado_5 + exento` (excepto autofactura, ticket
  máquina, boleta resimple, boletos de lotería en COMPRAS).
- RUC sin DV; el sistema calcula y muestra el DV pero no lo exporta.
- Timbrado: 8 dígitos numéricos.
- Número de comprobante: formato `###-###-#######` para comprobantes con
  número; excepciones: 112 (ticket máquina), 106 (boleto aéreo), 107 (despacho
  importación), 208 (liquidación de salario), 205/206/207 (extractos).
- Fecha ≥ 01/01/2021, salvo condición de venta a crédito.
- Liquidación de salario (208) y Extracto IPS (206): fecha en formato `mm/aaaa`.
- Imputación: al menos una de IVA / IRE / IRP-RSP debe ser "S"; si "NO IMPUTA"
  es "S", debe imputarse adicionalmente a otra.
- Condición de venta es requerida solo para tipo 109 (Factura).
- Tipo identificación del comprador 11/12/15: nombre no requerido.
- Tipos de comprobante restringidos por tipo de registro (Tabla 4 de la SET).

## 16. Manejo de errores

- Errores de Gemini → reintento con backoff, luego `REQUIERE_REVISION_MANUAL`.
- Errores de validación → no bloquean la edición, pero bloquean el registro.
- Errores de exportación → se notifica al usuario con detalle del archivo y
  fila problemática.
- Logs estructurados en backend (`pino` o similar), sin datos personales en
  texto plano.

## 17. Seguridad

- API Key de Gemini solo en servidor.
- Cifrado en reposo de la API Key (clave maestra en variable de entorno).
- HTTPS obligatorio en producción.
- Hash de contraseñas con `argon2`.
- Sesiones con tokens HTTP-only, SameSite=Strict.
- Sin exposición de filesystem: los archivos se sirven a través de endpoint
  autenticado.
- CSP estricta; sin scripts inline.
- Validación de tipos MIME y firma de archivos en upload.
- Límite de tamaño y de tasa por IP.

## 18. Accesibilidad

- Cumplimiento WCAG 2.1 nivel AA como objetivo.
- Contraste mínimo, navegación por teclado completa, etiquetas ARIA.
- Tipografía ≥ 14 px, alto de filas legible para uso prolongado.
- Confirmaciones de acciones destructivas con doble paso.

## 19. Auditoría y trazabilidad

- Cada cambio en un comprobante (especialmente post-registro) deja registro:
  campo, valor anterior, valor nuevo, usuario, fecha, motivo.
- El valor original extraído por Gemini se conserva incluso si el usuario lo
  edita, para análisis de calidad del modelo.
- Las exportaciones se registran (qué archivo, qué período, qué comprobantes
  incluidos, hash del ZIP generado).

## 20. Riesgos técnicos

- Cambios en la API de Gemini o rate-limits agresivos.
- Calidad muy variable de fotos tomadas con celular.
- PDFs grandes que excedan el contexto del modelo.
- Diferencias entre redondeos del usuario y los del PDF original.

## 21. Riesgos contables

- Imputación tributaria incorrecta por error del usuario al confirmar.
- Confusión entre régimen del cliente (IVA, IRE, IRP) y reglas aplicables.
- Olvido de informar comprobantes de la quincena/mes.
- Cargas duplicadas si dos personas suben el mismo archivo.

## 22. Supuestos

S1. El usuario contador conoce el régimen tributario de cada cliente y lo
configura al alta.
S2. El sistema NO debe leer ni importar comprobantes electrónicos (e-Kuatia);
esos se obtienen directamente de Marangatu.
S3. La SET no provee API pública de subida automática; el sistema genera el ZIP
para que el usuario lo suba manualmente.
S4. Las tablas de códigos (Tablas 1 a 5) de la Especificación Técnica vigente
son las de **junio/2021** y se mantienen hasta que la SET publique una nueva.
S5. El usuario tiene una API Key válida de Google AI Studio (Gemini).

## 23. Pendientes (deben confirmarse antes de programar)

Ver `02_PROJECT_MEMORY.md` sección "Dudas abiertas".
