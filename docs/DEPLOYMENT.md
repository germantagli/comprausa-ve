# Despliegue

No hay despliegue. Railway es el destino previsto de staging. Este documento es el plan para cuando alguien decida hacerlo. Conectar el repositorio a Railway no está hecho y no se debe inferir de estos archivos.

## Servicios previstos

| Servicio | Estado | Notas |
| --- | --- | --- |
| API | Imagen descrita, no publicada | `infrastructure/docker/api.Dockerfile`. Salud: `GET /health`. |
| Worker | No existe | BullMQ cuando haya jobs. No es dependencia del esqueleto. |
| Postgres | Plugin de Railway en staging; compose local para desarrollo | `DATABASE_URL` obligatorio solo en producción. |
| Redis | Previsto, no obligatorio | Perfil `optional` en compose. La API no lo abre. |

El plan escrito está en `infrastructure/railway/railway.plan.toml`. El nombre no es `railway.toml` para que un vínculo accidental no lo tome como configuración activa.

## Imagen

El Dockerfile es multi-stage: una etapa instala con pnpm y la otra copia el árbol y arranca la API con `tsx`. No está optimizada y no se publicó. `NODE_ENV=production` hace que el proceso exija `DATABASE_URL` y apague el OTP simulado. Los secretos entran por el entorno del proveedor, no por la imagen.

No se ejecutó `docker build` en este corte. La verificación de la fase es `pnpm typecheck` y `pnpm test`.

## Entornos

| Entorno | Datos | OTP | Pagos | Tiendas |
| --- | --- | --- | --- | --- |
| Desarrollo | Postgres local opcional | Simulado solo con la bandera | Apagados | Ninguna |
| Prueba (CI) | Sin base | El unitario construye el proveedor en memoria | Apagados | Ninguna |
| Staging | Por crear | Real, cuando exista proveedor | Apagados hasta elegibilidad | Ninguna |
| Producción | Por crear | Real | Solo los que estén permitidos | Solo un conector probado |

CI (`.github/workflows/verify.yml`) instala, hace typecheck y corre pruebas. No despliega.

## Salud y rollback

`GET /health` es viveza: no toca la base. `GET /health/ready` hace `SELECT 1` y responde 503 si Postgres no está. Un balanceador puede usar la viveza para no matar el proceso durante un blip de red, y la lectura para saber si conviene enviar tráfico.

Rollback previsto, cuando exista un release: volver la imagen anterior de la API y no aplicar una migración destructiva en el mismo paso. La migración inicial solo crea tablas. No hay dato que preservar todavía.

## Variables

`.env.example` lista `NODE_ENV`, `PORT`, `APP_DISPLAY_NAME`, `DATABASE_URL` local, `OTP_PROVIDER` y huecos vacíos para `AUTH_TOKEN_SECRET`, Stripe, PayPal y Redis. Ningún valor de ese archivo es una credencial de un proveedor.

## Local

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres
pnpm --filter @comprausa/api exec prisma migrate deploy
```

Eso sí necesita Docker y la base. El CI no lo corre.
