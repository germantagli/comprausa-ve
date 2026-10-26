# Despliegue

No hay despliegue. Railway es el destino previsto de staging y no está encendido. Este documento dice qué ya coincide con el código y qué falta para poder usarlo. No hay URL pública.

## Listo

| Pieza | Dónde | Qué hace hoy |
| --- | --- | --- |
| Imagen de la API | `infrastructure/docker/api.Dockerfile` | Node 22, pnpm 10.34.9, `pnpm install --frozen-lockfile`, `NODE_ENV=production`, arranque `pnpm --filter @comprausa/api exec tsx src/main.ts`. Escucha `PORT` y, si falta, 3001. |
| Viveza | `GET /health` | No toca Postgres. `payments` sigue en `not_configured`. El Dockerfile trae un `HEALTHCHECK` a esa ruta. |
| Lectura | `GET /health/ready` | `SELECT 1`. Sin Prisma responde 503 `{ status: "not_ready" }`. |
| Plan de Railway | `infrastructure/railway/railway.plan.toml` | Servicio `comprausa-api`, el Dockerfile de arriba y `healthcheck_path = "/health"`. El nombre no es `railway.toml`, así que Railway no lo toma solo. |
| Contrato de entorno | `parseAppEnv` en `packages/config` | En producción exige `DATABASE_URL` y `AUTH_TOKEN_SECRET` de 32 caracteres o más, distinto del marcador de desarrollo. Rechaza `OTP_PROVIDER=simulated`, `sk_live_` y `rk_live_`. |
| CI | `.github/workflows/verify.yml` | Instala, typecheck y pruebas. No despliega y no levanta Postgres. |
| Postgres local | `infrastructure/docker/docker-compose.yml` | Usuario, clave y base `comprausa` en el puerto 5432. Solo para desarrollo. |

La imagen no copia secretos. No corre migraciones. No se publicó y no se ejecutó `docker build` en este corte. La verificación sigue siendo `pnpm typecheck` y `pnpm test`.

## Falta para staging

1. Cuenta y proyecto de Railway. No hay uno vinculado a este repositorio.
2. Postgres de staging y `DATABASE_URL` en el entorno del proveedor. Sin eso el proceso de producción no arranca y `/health/ready` no pasa.
3. `AUTH_TOKEN_SECRET` en ese mismo entorno. No va en git.
4. Proveedor real de OTP. El simulado no arranca en producción y la ruta de desarrollo no se monta.
5. Claves de prueba, si se quieren usar: `STRIPE_SECRET_KEY` que empiece por `sk_test_` y `STRIPE_WEBHOOK_SECRET` que empiece por `whsec_`. Hoy están vacías, así que Stripe queda sin configurar. PayPal no captura. Zelle y Pago Móvil no tienen instrucciones.
6. Aplicar la migración de Prisma a mano cuando la base exista. La imagen no lo hace.

Redis no aplica. No hay cliente Redis ni BullMQ en el código. El perfil `optional` de compose y el plugin del plan quedan reservados. El worker no existe.

También quedan fuera de este esqueleto: almacenamiento S3 de comprobantes, límite de tasa compartido entre instancias, y un dominio. Nada de eso se inventa aquí.

## Servicios previstos

| Servicio | Estado | Notas |
| --- | --- | --- |
| API | Imagen descrita, no publicada | Salud de viveza: `GET /health`. |
| Worker | No existe | BullMQ cuando haya jobs. No es dependencia del esqueleto. |
| Postgres | Por crear en Railway; compose local para desarrollo | `DATABASE_URL` obligatorio solo en producción. |
| Redis | No requerido | La API no lo abre. |

## Entornos

| Entorno | Datos | OTP | Pagos | Tiendas |
| --- | --- | --- | --- | --- |
| Desarrollo | Postgres local opcional; sin URL, memoria | Simulado solo con `NODE_ENV=development` y `OTP_PROVIDER=simulated` | Apagados o de prueba, sin cobro | Ninguna |
| Prueba (CI) | Sin base | El proveedor simulado no arranca; las pruebas lo construyen en memoria | Apagados | Ninguna |
| Staging | No creado | Real, cuando exista proveedor | Apagados hasta elegibilidad | Ninguna |
| Producción | No creado | Real | Solo los que estén permitidos | Solo un conector probado |

## Salud y rollback

Un balanceador puede usar `GET /health` para saber si el proceso responde, y `GET /health/ready` para saber si Postgres contestó. La viveza no declara el pago configurado.

Rollback previsto, cuando exista un release: volver la imagen anterior de la API y no aplicar una migración destructiva en el mismo paso. La migración inicial solo crea tablas. No hay dato de staging que preservar.

## Variables

`.env.example` lista `NODE_ENV`, `PORT`, `APP_DISPLAY_NAME`, `DATABASE_URL` local, `OTP_PROVIDER` y huecos vacíos para `AUTH_TOKEN_SECRET`, Stripe, PayPal, Zelle, Pago Móvil y Redis. Ningún valor de ese archivo es una credencial de un proveedor.

En el proveedor, cuando el proyecto exista, el servicio de API necesita `DATABASE_URL`, `AUTH_TOKEN_SECRET`, `OTP_PROVIDER=none` y `PORT`. `WEB_ORIGIN` es opcional y hoy no hay origen de staging.

## Local

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres
pnpm --filter @comprausa/api exec prisma migrate deploy
```

Eso sí necesita Docker y la base. El CI no lo corre.
