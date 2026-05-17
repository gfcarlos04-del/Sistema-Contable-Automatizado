# Resumen Ejecutivo — Sistema de Registro de Comprobantes (Marangatu/DNIT)

## 1. Qué es

Aplicación web para asistir a contadores en el registro contable de comprobantes
(facturas físicas, fotos, PDFs escaneados o digitales), con extracción asistida
por Gemini y exportación al formato exacto que exige el módulo de **Importación
de Comprobantes** del Sistema Marangatu de la SET/DNIT (Paraguay).

El sistema **no reemplaza** al criterio profesional ni a Marangatu. Es una capa
de pre-captura, validación, revisión humana y exportación, con almacenamiento
separado por cliente.

## 2. Objetivo

- Reducir tiempo de carga manual de comprobantes.
- Minimizar errores de tipeo (RUC, timbrado, número, fechas, montos).
- Producir archivos importables a Marangatu (CSV/TXT en ZIP) que respeten
  estrictamente la Especificación Técnica de la SET (junio/2021).
- Mantener libros contables auxiliares en Excel por cliente (Libro IVA, IVA+IRE,
  IRP) según los modelos publicados por la SET.

## 3. Alcance fijado por los documentos guía

La SET publica tres niveles de archivos, y este sistema cubre los tres:

1. **Planilla oficial de Importación a Marangatu** (`Modelo de Planilla para
   Registro de Comprobantes en Marangatu`) → genera CSV/TXT en ZIP con nombre
   `<RUC>_REG_MMAAAA_XXXXX.zip` o `<RUC>_REG_AAAA_XXXXX.zip`.
2. **Libro de Ventas/Ingresos/Compras/Egresos para IVA o IVA+IRE**.
3. **Libro de Ingresos y Egresos para contribuyentes solo de IRP**.

Cada cliente tendrá las tres salidas disponibles según su régimen tributario
(IVA, IRE, IRP-RSP, o combinaciones).

## 4. Decisiones tomadas hasta ahora

- Multi-cliente desde el día 1. Cada cliente tiene RUC informante, régimen,
  archivos físicos, libros y exportaciones separadas.
- Gemini se usa **solo para extracción**, no para decidir imputación tributaria.
  La imputación (IVA / IRE / IRP-RSP / NO IMPUTA) la define el usuario en base
  al régimen del cliente y al criterio contable.
- Aprobación humana obligatoria antes de registrar.
- API Key de Gemini se guarda en el backend, nunca llega al frontend.

## 5. Stack propuesto (justificado en el SDD)

- Frontend: Next.js (App Router) + React + TypeScript + TailwindCSS.
- Backend: Node.js con Next.js Route Handlers (o NestJS si se separa).
- Base de datos: PostgreSQL (Supabase o self-hosted) con Prisma.
- Almacenamiento de archivos: filesystem local en V1, S3-compatible en V2.
- IA: Gemini 2.5 (multimodal: imagen + PDF) vía Google AI Studio API.
- Excel: ExcelJS para mantener formato y estilos del Excel modelo.
- PDF render: pdf.js en el frontend.

## 6. Riesgos críticos identificados

- **Riesgo contable:** una imputación incorrecta puede generar inconsistencias
  fiscales para el cliente. Mitigación: regla de "no se imputa automáticamente
  con baja confianza", y bloqueo de campos críticos hasta aprobación.
- **Riesgo OCR:** confusión entre 0/O, 1/I/l, 5/S, separadores de miles.
  Mitigación: validación cruzada `gravado10 + gravado5 + exento = total`.
- **Riesgo de duplicados:** factura escaneada dos veces. Mitigación: clave
  natural `(cliente, ruc_emisor, timbrado, número, fecha)` con bloqueo.
- **Riesgo regulatorio:** las tablas de códigos de la SET pueden cambiar.
  Mitigación: catálogos versionados en base de datos, no hardcoded.

## 7. Lo que NO está confirmado todavía

Ver `02_PROJECT_MEMORY.md` sección "Dudas abiertas". Las más importantes:

- ¿El usuario es siempre el mismo contador (single-user) o necesita
  multi-usuario con roles?
- ¿Va a usar también para facturación electrónica (e-Kuatia) ya disponible en
  Marangatu, o solo para comprobantes manuales? La SET dice que no se deben
  incluir comprobantes electrónicos en el archivo de importación.
- ¿Qué régimen tributario tiene cada cliente (IVA, IRE, IRP-RSP)? Define qué
  libros se generan.
- ¿La empresa que usa el sistema tiene su propio RUC informante o cada cliente
  declara por sí mismo?

## 8. Próximos pasos

1. El usuario revisa este resumen y responde las preguntas críticas.
2. Aprobación del SDD (`01_SDD.md`).
3. Inicio de la implementación según `10_PLAN_Y_BACKLOG.md`.
