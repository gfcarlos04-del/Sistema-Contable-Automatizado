# Tavex — web

Subproyecto Next.js 16 (App Router + TS + Tailwind v4) que contiene la web,
las API routes y el worker BullMQ de **Tavex**.

Documentación completa en [`../README.md`](../README.md) y `../docs/`.

## Scripts útiles

| Comando                           | Qué hace                                                  |
| --------------------------------- | --------------------------------------------------------- |
| `npm run dev`                     | Levanta el server con Turbopack en http://localhost:3000  |
| `npm run build`                   | Build de producción (standalone, usado por el Dockerfile) |
| `npm run start`                   | Sirve el build de producción local                        |
| `npm run db:migrate`              | Aplica migraciones Prisma a la DB del `.env.local`        |
| `npm run db:seed`                 | Siembra catálogos SET (Tablas 1–5)                        |
| `npm run db:studio`               | Abre Prisma Studio                                        |
| `npm run worker`                  | Corre el worker BullMQ local (necesita Redis)             |
| `npm run test`                    | Tests con vitest en modo watch                            |
| `npm run test:run`                | Tests one-shot                                            |
| `npm run typecheck`               | `tsc --noEmit`                                            |
| `npm run lint`                    | ESLint                                                    |
| `npm run format` / `format:check` | Prettier                                                  |

## Deploy

CI (GitHub Actions) corre lint + typecheck + tests en todo push, y en `main`
ejecuta `flyctl deploy`. App en **https://tavex.fly.dev**.
