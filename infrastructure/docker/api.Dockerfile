# Imagen de la API para staging en Railway.
# Build context: raíz del monorepo.
# En producción el proceso exige DATABASE_URL y AUTH_TOKEN_SECRET;
# OTP_PROVIDER=simulated queda rechazado.

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.9 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
# prisma generate no abre la base; la URL solo satisface el schema.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN pnpm --filter @comprausa/api exec prisma generate

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.34.9 --activate
COPY --from=deps /app /app
EXPOSE 3001
CMD ["pnpm", "--filter", "@comprausa/api", "exec", "tsx", "src/main.ts"]
