# syntax=docker/dockerfile:1.7
# Imagen única para web Next.js (standalone) + worker BullMQ.
# Fly.io ejecuta dos procesos sobre la misma imagen (ver fly.toml).

# ─── Stage 1: deps ────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
# Necesario para que Prisma engines descarguen ok en alpine.
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ─── Stage 2: builder ─────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma genera el cliente y los engines en src/generated/prisma.
RUN npx prisma generate
# Next.js 16 usa Turbopack por defecto en build. Genera .next/standalone.
RUN npm run build

# ─── Stage 3: runner (web) ────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat openssl tini
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Web standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Para el worker necesitamos el código TS, tsx y los engines Prisma.
COPY --from=builder --chown=nextjs:nodejs /app/src/worker ./src/worker
COPY --from=builder --chown=nextjs:nodejs /app/src/lib ./src/lib
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bullmq ./node_modules/bullmq
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/ioredis ./node_modules/ioredis
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/tsx ./node_modules/.bin/tsx
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# tini reaper para que Fly maneje señales correctamente.
ENTRYPOINT ["/sbin/tini", "--"]
# Comando por defecto: web. El worker se lanza con `node_modules/.bin/tsx src/worker/index.ts`
# desde fly.toml (`processes.worker`).
CMD ["node", "server.js"]
