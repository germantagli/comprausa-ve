# Imagen de referencia para la API. No está publicada ni desplegada.
# El proceso de producción exige DATABASE_URL y rechaza el OTP simulado.

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.9 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.34.9 --activate
COPY --from=deps /app /app
EXPOSE 3001
# Viveza. No abre Postgres. El proceso solo escucha si el entorno de producción es válido.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"
CMD ["pnpm", "--filter", "@comprausa/api", "exec", "tsx", "src/main.ts"]
