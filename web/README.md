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
| `npm run db:seed:e2e`             | Crea org + usuario admin + cliente para tests E2E         |
| `npm run db:studio`               | Abre Prisma Studio                                        |
| `npm run worker`                  | Corre el worker BullMQ local (necesita Redis)             |
| `npm run test`                    | Tests unitarios con vitest en modo watch                  |
| `npm run test:run`                | Tests unitarios one-shot                                  |
| `npm run test:e2e`                | Playwright E2E (necesita seed:e2e + dev server activo)    |
| `npm run test:e2e:ui`             | Playwright en modo UI interactivo                         |
| `npm run typecheck`               | `tsc --noEmit`                                            |
| `npm run lint`                    | ESLint                                                    |
| `npm run format` / `format:check` | Prettier                                                  |

## Tests E2E (Playwright)

```bash
# 1. (Una sola vez) crear usuario y cliente de prueba en la DB
npm run db:seed:e2e

# 2. (En una terminal) levantar el dev server
npm run dev

# 3. (En otra terminal) correr los tests
npm run test:e2e
```

Credenciales por defecto: `test@tavex.test` / `test1234567`.
Para sobreescribir: exportar `E2E_USER_EMAIL` y `E2E_USER_PASSWORD` antes de
correr `db:seed:e2e` **y** `test:e2e` con los mismos valores.

⚠️ El seed E2E **rechaza** ejecutarse si `DATABASE_URL` contiene `prod`,
`production` o `live`. Para forzar (no recomendado): `ALLOW_E2E_SEED_IN_PROD=1`.

## Deploy

CI (GitHub Actions) corre lint + typecheck + tests en todo push, y en `main`
ejecuta `flyctl deploy`. App en **https://marangatu-web.fly.dev**.
