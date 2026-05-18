# Tavex

**Tavex** es un SaaS multi-tenant para asistir el registro contable de comprobantes
en Paraguay, con extracción asistida por Gemini y exportación al formato exigido
por el módulo de **Importación de Comprobantes** del Sistema Marangatu (SET/DNIT).

> Tavex no reemplaza a Marangatu ni al criterio profesional del contador.
> Es una capa de pre-captura, validación, revisión humana y exportación,
> separada por cliente y por organización.

## Estructura del repo

```
.
├── docs/                      # Documentación viva del proyecto (SDD, plan, etc.)
├── Guía y datos de la DNIT/   # Material oficial de referencia (PDF + Excel modelo)
└── web/                       # Aplicación Next.js (frontend + API + workers)
```

## Stack

- **Frontend / API:** Next.js 16 (App Router) + TypeScript + TailwindCSS
- **DB:** PostgreSQL en Neon (dev y prod)
- **ORM:** Prisma
- **Auth:** NextAuth (credenciales) con roles `admin` / `operador`
- **Cola:** BullMQ + Redis (Upstash)
- **Archivos:** Cloudflare R2 (S3-compatible)
- **IA:** Gemini 2.5 (server-side, API Key cifrada por organización)
- **Hosting prod:** Fly.io (región `gru` — São Paulo). Web Next.js + worker BullMQ en la misma app.

## Quickstart (dev)

```bash
cd web
npm install
cp .env.example .env.local   # completar con credenciales
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Documentación

- [Resumen ejecutivo](docs/00_RESUMEN_EJECUTIVO.md)
- [SDD](docs/01_SDD.md)
- [Memoria viva del proyecto](docs/02_PROJECT_MEMORY.md)
- [Plan y backlog](docs/10_PLAN_Y_BACKLOG.md)
