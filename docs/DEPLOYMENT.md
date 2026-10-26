# Despliegue

Staging previsto en Railway. La definición versionada está en `.railway/railway.ts`. Conectar el repositorio y aplicar esa configuración requiere autenticación en Railway; hasta entonces no hay proyecto ni URL pública.

## Servicios

| Servicio | Estado | Notas |
| --- | --- | --- |
| API (`comprausa-api`) | Definida en IaC, no aplicada | Dockerfile `infrastructure/docker/api.Dockerfile`. Salud: `GET /health`. Pre-deploy: `prisma migrate deploy`. |
| Postgres | Definido en IaC | `DATABASE_URL` referenciada por la API. |
| Worker | No existe | BullMQ cuando haya jobs. |
| Redis | No en este corte | La API no lo abre. |

## Primer vínculo (manual o con token)

```bash
# CLI
curl -fsSL https://railway.com/install.sh | sh
railway login
# Alternativa no interactiva: export RAILWAY_API_TOKEN=...

# GitHub debe estar autorizado en https://railway.com/account/github

railway init --name comprausa-ve   # o: railway link
railway config plan
railway config apply --yes

railway domain --service comprausa-api
railway variable set AUTH_TOKEN_SECRET="$(openssl rand -base64 48)" --service comprausa-api
railway redeploy --service comprausa-api
```

Detalle y checklist en `.railway/README.md`.

CI de infra (opcional): `.github/workflows/railway-config.yml` planea/aplica cambios de `.railway/` cuando exista el secreto de repositorio `RAILWAY_TOKEN` (project token del entorno).

## Imagen

Dockerfile multi-stage: instala con pnpm, genera el cliente Prisma y arranca la API con `tsx`. `NODE_ENV=production` exige `DATABASE_URL` y `AUTH_TOKEN_SECRET` (≥ 32 caracteres, distinto del marcador de desarrollo) y rechaza `OTP_PROVIDER=simulated`. Los secretos entran por el entorno de Railway, no por la imagen.

## Entornos

| Entorno | Datos | OTP | Pagos | Tiendas |
| --- | --- | --- | --- | --- |
| Desarrollo | Postgres local opcional | Simulado solo con la bandera | Apagados | Ninguna |
| Prueba (CI) | Sin base | El unitario construye el proveedor en memoria | Apagados | Ninguna |
| Staging | Por crear vía IaC | `OTP_PROVIDER=none` hasta proveedor real | Apagados hasta elegibilidad | Ninguna |
| Producción | Por crear | Real | Solo los que estén permitidos | Solo un conector probado |

CI de verificación (`.github/workflows/verify.yml`) instala, hace typecheck y corre pruebas. No despliega la app.

## Salud y rollback

`GET /health` es viveza: no toca la base. `GET /health/ready` hace `SELECT 1` y responde 503 si Postgres no está.

Rollback previsto: volver el despliegue anterior de la API en Railway y no aplicar una migración destructiva en el mismo paso. Las migraciones actuales solo crean tablas.

## Variables

`.env.example` lista `NODE_ENV`, `PORT`, `APP_DISPLAY_NAME`, `DATABASE_URL` local, `OTP_PROVIDER`, `AUTH_TOKEN_SECRET` y huecos para Stripe, PayPal y Redis. Ningún valor de ese archivo es una credencial de un proveedor.

## Local

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres
pnpm --filter @comprausa/api exec prisma migrate deploy
```

Eso sí necesita Docker y la base. El CI no lo corre.
