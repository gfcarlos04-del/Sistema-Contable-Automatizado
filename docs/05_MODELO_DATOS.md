# Modelo de datos propuesto

PostgreSQL + Prisma. Nombres en `snake_case`. PK = `id` UUID v7.

## Diagrama resumido

```
cliente 1───∞ comprobante 1───∞ campo_extraido
                │   │
                │   └──∞ auditoria_cambio
                │
                └──1 archivo

catalogo_tipo_comprobante     catalogo_tipo_identificacion
catalogo_condicion            catalogo_booleano

usuario  exportacion  configuracion
```

## Tablas

### `organizacion` (tenant)
- id (uuid PK)
- nombre (text)
- slug (text unique)
- plan (text) — `free`, `pro`, etc.
- creado_en, actualizado_en
- activo (bool)

> Todo lo demás (clientes, usuarios, archivos, comprobantes) pertenece a una
> organización. Cada query filtra por `organizacion_id`. Row-level security
> en Postgres (RLS) si se usa Supabase.

### `usuario`
- id (uuid PK)
- organizacion_id (fk)
- email (text unique global)
- hash_password (argon2)
- nombre (text)
- rol (enum) — `admin`, `operador`
- activo (bool)
- creado_en

### `cliente`
- id (uuid PK)
- organizacion_id (fk)
- razon_social (text)
- ruc (text, sin DV)
- dv (int)
- regimen (text[]) — combinación de `IVA`, `IRE`, `IRE_SIMPLE`, `IRP_RSP`
- activo (bool, default true)
- creado_en, actualizado_en
- unique (organizacion_id, ruc)

### `comprobante`
- id (uuid)
- organizacion_id (fk)
- cliente_id (fk)
- origen (enum) — `MANUAL_PDF_IMG`, `E_KUATIA_XML`. Default `MANUAL_PDF_IMG`.
  Los `E_KUATIA_XML` se excluyen automáticamente al exportar a ZIP Marangatu.
- tipo_registro (smallint) — 1..4
- tipo_comprobante (smallint) — 101..211
- fecha_emision (date) o periodo (text `mm/yyyy`)
- timbrado (text 8)
- numero (text) — `###-###-#######`
- tipo_identificacion_contraparte (smallint) — tabla 3
- ruc_contraparte (text, sin DV)
- dv_contraparte (int, opcional)
- nombre_contraparte (text)
- moneda (text, default `PYG`)
- operacion_moneda_extranjera (char(1) S/N)
- monto_gravado_10 (numeric(18,0))
- iva_10 (numeric(18,0))
- monto_gravado_5 (numeric(18,0))
- iva_5 (numeric(18,0))
- exento (numeric(18,0))
- total (numeric(18,0))
- condicion_operacion (smallint) — 1/2
- imputa_iva (char(1))
- imputa_ire (char(1))
- imputa_irp_rsp (char(1))
- no_imputa (char(1))
- comprobante_asociado_numero (text)
- comprobante_asociado_timbrado (text)
- especificar_tipo_documento (text) — para 209/210
- numero_cuenta (text) — 207/211
- banco (text) — 207/211
- identificador_empleador_ips (text) — 206
- estado (enum) — `CARGADO`, `EXTRAYENDO`, `EXTRAIDO`, `EN_REVISION`,
  `REGISTRADO`, `PENDIENTE`, `RECHAZADO`, `DUPLICADO`,
  `REQUIERE_REVISION_MANUAL`
- confianza_general (smallint 0..100)
- archivo_id (fk)
- hash_archivo (char(64))
- gemini_request_id (text)
- gemini_modelo (text)
- creado_por (fk usuario)
- aprobado_por (fk usuario, nullable)
- aprobado_en (timestamptz)
- registrado_en (timestamptz)
- creado_en, actualizado_en

Índices:
- unique `(cliente_id, ruc_contraparte, timbrado, numero, fecha_emision)` para
  detección de duplicados.
- `(cliente_id, fecha_emision)` para reportes mensuales.
- `(cliente_id, estado)`.

### `campo_extraido`
- id
- comprobante_id (fk)
- campo (text) — nombre canónico
- valor_extraido (text) — lo que dijo Gemini
- valor_final (text) — lo que quedó después de edición
- confianza (smallint 0..100)
- status (enum) — `CONFIABLE`, `DUDOSO`, `FALTANTE`, `REQUIERE_REVISION`,
  `EDITADO_MANUALMENTE`
- observacion (text, nullable)
- ubicacion_bbox (jsonb, opcional) — bounding box en el documento

### `archivo`
- id
- cliente_id (fk)
- ruta (text) — relativa al storage
- mime (text)
- tamano_bytes (bigint)
- paginas (int, nullable)
- hash_sha256 (char(64))
- subido_por (fk usuario)
- subido_en

### `auditoria_cambio`
- id
- entidad (text) — `comprobante`, `cliente`, etc.
- id_entidad (uuid)
- campo (text)
- valor_anterior (text)
- valor_nuevo (text)
- usuario_id (fk)
- motivo (text)
- creado_en

### `exportacion`
- id
- cliente_id (fk)
- tipo (enum) — `MARANGATU_ZIP`, `PLANILLA_XLSX`, `LIBRO_IVA`, `LIBRO_IRP`
- periodo (text) — `MMYYYY` o `YYYY`
- obligacion (smallint) — 955 o 956
- ruta_archivo (text)
- hash_archivo (char(64))
- registros_incluidos (int)
- creado_por (fk)
- creado_en

### `usuario` (V1: 1 fila)
- id, email, hash_password (argon2), rol (`admin`/`operador`), nombre, activo

### `configuracion`
- clave (text PK)
- valor_cifrado (bytea)
- valor (text)
- actualizado_en
- actualizado_por

Entradas previstas:
- `gemini.api_key` (cifrada)
- `gemini.modelo` (default `gemini-2.5-pro`)
- `app.zona_horaria` (`America/Asuncion`)
- `app.moneda_base` (`PYG`)

### Catálogos (versionados)

- `catalogo_tipo_comprobante` (codigo PK, descripcion, tipos_registro_permitidos[], vigente_desde, vigente_hasta)
- `catalogo_tipo_identificacion` (codigo PK, descripcion, vigente_desde, vigente_hasta)
- `catalogo_condicion` (codigo PK, descripcion, vigente_desde, vigente_hasta)

Se siembran con los valores de Especificación Técnica junio/2021.

## Reglas de inmutabilidad

- Comprobantes en estado `REGISTRADO` no pueden modificarse directamente. Toda
  modificación crea una fila en `auditoria_cambio` con motivo obligatorio.
- Los archivos originales nunca se sobreescriben. Si el usuario corrige el
  comprobante, se conserva el archivo original.
- Las exportaciones quedan registradas con hash; un cambio posterior en un
  comprobante exportado genera una alerta visible al usuario.
