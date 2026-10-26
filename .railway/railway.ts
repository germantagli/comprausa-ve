/**
 * CompraUSA VE — staging en Railway (Infrastructure as Code).
 *
 * No se aplica solo. Hace falta CLI autenticado:
 *   railway login   # o RAILWAY_API_TOKEN / RAILWAY_TOKEN
 *   railway init --name comprausa-ve   # si el proyecto no existe
 *   railway link                       # si ya existe
 *   railway config plan
 *   railway config apply --yes
 *
 * Después del primer apply, generar dominio y el secreto de sesión:
 *   railway domain --service comprausa-api
 *   railway variable set AUTH_TOKEN_SECRET="$(openssl rand -base64 48)" --service comprausa-api
 *   railway redeploy --service comprausa-api
 */
import {
  defineRailway,
  github,
  postgres,
  project,
  service,
} from "railway/iac";

export default defineRailway(() => {
  const db = postgres("postgres");

  const api = service("comprausa-api", {
    source: github("germantagli/comprausa-ve", { branch: "main" }),
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "infrastructure/docker/api.Dockerfile",
      watchPatterns: [
        "/apps/api/**",
        "/packages/**",
        "/package.json",
        "/pnpm-lock.yaml",
        "/pnpm-workspace.yaml",
        "/.npmrc",
        "/infrastructure/docker/api.Dockerfile",
      ],
    },
    preDeploy: "pnpm --filter @comprausa/api exec prisma migrate deploy",
    healthcheck: "/health",
    healthcheckTimeout: 60,
    env: {
      NODE_ENV: "production",
      APP_DISPLAY_NAME: "CompraUSA VE",
      OTP_PROVIDER: "none",
      DATABASE_URL: db.env.DATABASE_URL,
      // Path de Dockerfile: Railway lo lee como variable de servicio.
      RAILWAY_DOCKERFILE_PATH: "infrastructure/docker/api.Dockerfile",
    },
  });

  return project("comprausa-ve", {
    resources: [api, db],
  });
});
