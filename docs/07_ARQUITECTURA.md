# Arquitectura técnica

## Stack propuesto y justificación

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS + shadcn/ui | Productividad alta, soporte SSR/CSR mezclado, comunidad madura, fácil despliegue. |
| Visor PDF | pdf.js (react-pdf) | Estándar de facto, sin servidor adicional. |
| Backend | Route Handlers de Next.js + módulos de servicio en TS. (Alternativa: NestJS si crece.) | Un solo runtime, despliegue simple. NestJS justificable si se separan workers. |
| ORM | Prisma | DX, migraciones, tipado, buena documentación en español. |
| Base de datos | PostgreSQL 16 (local en V1, Supabase/RDS en V2) | Estándar, integridad transaccional, buen soporte de jsonb. |
| Cola de trabajos | **BullMQ + Redis** desde V1 | Volumen alto declarado por el usuario; `pg-boss` no escala bien con miles de jobs/mes. |
| Almacenamiento de archivos | **S3-compatible (Cloudflare R2) desde V1** | El producto es SaaS cloud multi-tenant; filesystem local no aplica. |
| Autenticación | **NextAuth (Auth.js)** con credenciales + (opcional) Google OAuth | Multi-tenant con roles desde V1. |
| Multi-tenancy | Postgres con RLS (Supabase) o filtrado en aplicación (cualquier provider) | Aislamiento estricto entre organizaciones. |
| IA | Gemini 2.5 (Pro o Flash) vía `@google/genai` | Multimodal nativo con PDF e imágenes; bueno en español. |
| Excel | ExcelJS | Respeta estilos del modelo oficial. |
| Logs | pino + pino-pretty | Estructurado, rendimiento. |
| Testing | Vitest + Playwright | Velocidad, ergonomía. |
| Linter/format | ESLint + Prettier + typescript strict | Calidad de código. |

## Decisiones técnicas claves

- **Server-side only para Gemini.** El frontend nunca conoce la API Key. Toda
  llamada a Gemini se hace desde Route Handlers o un worker.
- **Idempotencia de upload.** El hash SHA-256 del archivo permite detectar
  reenvíos y evitar duplicados de almacenamiento.
- **Catálogos versionados** con `vigente_desde` / `vigente_hasta` para
  soportar cambios futuros de la SET sin migrar datos antiguos.
- **Inmutabilidad post-registro** vía constraints y triggers (a nivel app y
  BD) que exigen pasar por `auditoria_cambio`.
- **Separación cliente-a-cliente** a nivel de directorio (`storage/clientes/<id>/...`)
  y a nivel de query (filtro `cliente_id` en cada acceso).

## Estructura de carpetas sugerida del proyecto

```
proyecto/
├── apps/
│   └── web/                     # Next.js
│       ├── app/
│       │   ├── (auth)/
│       │   ├── (dashboard)/
│       │   │   ├── clientes/
│       │   │   ├── comprobantes/
│       │   │   ├── revision/
│       │   │   ├── historial/
│       │   │   ├── exportar/
│       │   │   └── config/
│       │   ├── api/             # Route Handlers
│       │   │   ├── clientes/
│       │   │   ├── comprobantes/
│       │   │   ├── extraccion/
│       │   │   ├── validacion/
│       │   │   ├── exportacion/
│       │   │   └── auditoria/
│       ├── components/
│       │   ├── ui/              # shadcn
│       │   ├── visor/
│       │   ├── panel-campos/
│       │   └── ...
│       ├── lib/
│       │   ├── gemini/          # cliente, prompt, parser
│       │   ├── validacion/      # reglas DNIT
│       │   ├── exportacion/
│       │   │   ├── marangatu-csv.ts
│       │   │   ├── planilla-xlsx.ts
│       │   │   ├── libro-iva-xlsx.ts
│       │   │   └── libro-irp-xlsx.ts
│       │   ├── catalogos/
│       │   ├── auth/
│       │   └── db/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts          # tablas 1-5 vigentes
│       ├── workers/
│       │   └── extraccion-worker.ts
│       └── package.json
├── docs/                        # estos archivos
├── storage/                     # archivos físicos (gitignored)
│   └── clientes/<uuid>/<año>/<mes>/
├── Guía y datos de la DNIT/     # material de referencia (ya existe)
└── README.md
```

## Despliegue (SaaS cloud, decidido el 2026-05-13)

Stack recomendado para V1 SaaS:

- **Web (Next.js)** → Vercel (PRO) o Fly.io. Vercel se integra mejor con
  Next.js; Fly da más control sobre workers.
- **DB Postgres** → Supabase (incluye RLS, auth opcional, storage) o Neon
  (mejor pricing por uso).
- **Redis** → Upstash (serverless, ideal para BullMQ desde Vercel).
- **Storage de archivos** → Cloudflare R2 (sin egress fees) o S3.
- **Workers de extracción** → Fly.io workers o Vercel Cron + Edge Functions
  (limitadas en duración; preferible Fly).
- **Observabilidad** → Sentry + Axiom o Logtail para logs.

Esquema de costos a estimar antes de cerrar provider:
- Gemini: tokens × volumen mensual.
- Storage R2: GB almacenados.
- Postgres: filas + IOPS.
- Redis: comandos/mes.
- Egress (Vercel/Fly): GB salientes.

## Aislamiento multi-tenant

- Toda fila lleva `organizacion_id`. La capa de acceso (`db/index.ts`) exige
  el `organizacion_id` del contexto de sesión en cada query.
- Si se usa Supabase, además se activan **Row Level Security (RLS)** policies
  por tabla, usando un claim `org_id` en el JWT.
- Archivos: cada objeto en R2 lleva prefijo `org/<id>/...`. Las URLs firmadas
  expiran en minutos.
- Pruebas E2E incluyen un caso explícito de "intento de acceso cruzado entre
  organizaciones" que debe fallar con 403.

## Backups

- Postgres: `pg_dump` diario, retención 30 días.
- Archivos: rsync diario a disco externo (V1) o replicación S3 (V2).
- ZIPs de exportación se conservan permanentemente (referencia ante
  auditorías).
