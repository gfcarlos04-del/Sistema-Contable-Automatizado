# Plan de implementación por etapas + Backlog inicial

## Fases

### Fase 0 — Cimientos SaaS (1.5 semanas)
- Setup repo + Next.js 15 + Tailwind + Prisma + Postgres (Supabase o Neon).
- Esquema Prisma inicial con `organizacion`, `usuario`, `cliente`,
  `comprobante`, `archivo`, catálogos.
- Seed de Tablas 1 a 5 de la SET (junio/2021).
- NextAuth con credenciales + roles `admin`/`operador`.
- Onboarding: signup crea organización + primer admin.
- Bucket R2 + helper de URLs firmadas.
- Redis (Upstash) + BullMQ con worker placeholder.

**Entregable:** SaaS vacío con signup/login multi-tenant funcional.

### Fase 1 — Gestión de clientes y carga (1 semana)
- CRUD de clientes (validar RUC + DV).
- Header con selector de cliente.
- Upload de comprobantes con hash, almacenamiento por cliente, deduplicación.
- Visor PDF/imagen funcional.

**Entregable:** se pueden cargar comprobantes y verlos por cliente.

### Fase 2 — Extracción Gemini + revisión (2 semanas)
- Cliente Gemini server-side.
- Worker de extracción (`pg-boss`).
- Pantalla de revisión con panel de campos + visor sincronizado.
- Sistema de confianza por campo y general.
- Edición manual con auditoría.
- Aprobación y registro.

**Entregable:** flujo end-to-end desde carga a registro.

### Fase 3 — Validaciones DNIT completas (1 semana)
- Motor de validación con todas las reglas V-001..V-022, C-001..C-007.
- Detección de duplicados.
- Bloqueos por confianza baja.

**Entregable:** validación cumpliendo la Especificación Técnica.

### Fase 4 — Exportaciones (2 semanas)
- Exportación CSV/TXT en ZIP con nombre `<RUC>_REG_MMAAAA_XXXXX.zip` (mensual)
  y `<RUC>_REG_AAAA_XXXXX.zip` (anual).
- **Exclusión automática** de comprobantes con `origen = E_KUATIA_XML`.
- Paginación a 5.000 filas por archivo.
- Exportación Excel "Planilla Marangatu" (4 hojas, respetando cabeceras fila 10).
- Exportación Libro IVA / IVA+IRE (incluye e-Kuatia).
- Exportación Libro IRP (incluye e-Kuatia).
- Registro de exportaciones con hash.
- Importación de XML e-Kuatia (parser + normalización + carga directa en
  estado `REGISTRADO` con `origen = E_KUATIA_XML`).

**Entregable:** archivos listos para subir a Marangatu + libros consolidados.

### Fase 5 — Historial, auditoría, dashboard (1 semana)
- Historial filtrable.
- Pantalla de auditoría con búsqueda.
- Dashboard del cliente activo.

**Entregable:** observabilidad operativa para el contador.

### Fase 6 — Hardening (1 semana)
- Backups automáticos.
- Tests E2E con Playwright sobre comprobantes muestra.
- Documentación de usuario.
- Empaquetado/instalación.

**Entregable:** sistema listo para producción local.

**Total estimado: 9–10 semanas de trabajo enfocado.** (Aumentó por SaaS multi-tenant, roles, e-Kuatia, cloud infra.)

---

## Backlog inicial (primeras dos fases en detalle)

### Fase 0

- [ ] F0-1 — `git init` y estructura monorepo / single repo.
- [ ] F0-2 — Next.js 15 con App Router + TS strict + Tailwind + shadcn/ui.
- [ ] F0-3 — Docker Compose con Postgres 16.
- [ ] F0-4 — Prisma init y schema base (cliente, archivo, catálogos).
- [ ] F0-5 — Migración inicial.
- [ ] F0-6 — Seed con Tablas 1 a 5 de la SET y mapeos.
- [ ] F0-7 — Login local (argon2 + cookie session).
- [ ] F0-8 — Layout base (header con selector cliente, sidebar).
- [ ] F0-9 — Página de configuración con campo "API Key Gemini" (cifrada en
  reposo).
- [ ] F0-10 — Pipeline CI mínimo (lint + typecheck).

### Fase 1

- [ ] F1-1 — Endpoint y UI de alta de cliente con validación de RUC+DV.
- [ ] F1-2 — Listado, edición, baja lógica de clientes.
- [ ] F1-3 — Persistencia del cliente activo en sesión.
- [ ] F1-4 — Drag-and-drop de archivos con preview.
- [ ] F1-5 — Endpoint de upload (multipart, validación MIME, hash).
- [ ] F1-6 — Almacenamiento por cliente y por año/mes.
- [ ] F1-7 — Detección de duplicado por hash + advertencia.
- [ ] F1-8 — Listado de comprobantes del cliente con estado.
- [ ] F1-9 — Página de detalle con visor PDF.js / imagen.
- [ ] F1-10 — Tests unitarios de validador RUC+DV.

### Fase 2 (resumen, se detalla cuando se cierre la 1)

- [ ] F2-1 — Cliente Gemini con `@google/genai`, prompt y schema.
- [ ] F2-2 — Worker `pg-boss` de extracción.
- [ ] F2-3 — Persistencia de `campo_extraido`.
- [ ] F2-4 — Pantalla de revisión split.
- [ ] F2-5 — Sistema de badges de confianza por campo.
- [ ] F2-6 — Edición con auditoría.
- [ ] F2-7 — Aprobación, rechazo, pendiente, re-extracción.
- [ ] F2-8 — Tests de parser de salida Gemini.

---

## Criterios de aceptación globales

- Todo comprobante registrado tiene su archivo original conservado y hash
  verificable.
- Ningún comprobante puede registrarse si viola V-001..V-022.
- La exportación ZIP, al renombrarse al formato exigido, debe poder
  cargarse en Marangatu sin errores (verificar contra el modelo del PDF).
- Las tres exportaciones Excel deben respetar las cabeceras exactas de los
  modelos oficiales.
- Cambios post-registro siempre dejan rastro en `auditoria_cambio`.
