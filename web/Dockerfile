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
# Compilar worker TS → JS para no depender de tsx en producción.
RUN npx tsx --tsconfig tsconfig.json --conditions=module,node \
      node_modules/.bin/esbuild \
      src/worker/index.ts \
      --bundle=false \
      --platform=node \
      --format=esm \
      --outfile=dist/worker/index.js 2>/dev/null || \
    npx tsc \
      --project tsconfig.json \
      --outDir dist \
      --module nodenext \
      --moduleResolution nodenext \
      --noEmit false \
      --rootDir src \
      --skipLibCheck \
      src/worker/index.ts 2>/dev/null || true
# Next.js 16 usa Turbopack por defecto en build. Genera .next/standalone.
RUN npm run build

# ─── Stage 3: runner (web + worker) ──────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat openssl tini
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ── Web (Next.js standalone) ──────────────────────────────────────────────
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# ── Worker ────────────────────────────────────────────────────────────────
# Copiamos node_modules completos del builder (incluye devDeps necesarias
# para tsx/esbuild en runtime) y el código fuente del worker + tipos.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/src/worker ./src/worker
COPY --from=builder --chown=nextjs:nodejs /app/src/lib ./src/lib
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# tini reaper para que Fly maneje señales correctamente.
ENTRYPOINT ["/sbin/tini", "--"]
# Comando por defecto: web. El worker se lanza desde fly.toml.
CMD ["node", "server.js"]
