# CompraUSA VE

Plataforma en construcción para que una persona en Venezuela pida productos de tiendas de Estados Unidos y los reciba en Venezuela, sin administrar un casillero. El nombre es provisional y sale de `APP_DISPLAY_NAME`. La moneda de trabajo es USD.

Este repositorio tiene la arquitectura de la fase 1 y el ingreso por OTP. No hay tienda, checkout, pagos ni panel.

## Qué está de verdad

- Monorepo TypeScript (pnpm y Turborepo).
- API NestJS con `GET /health`, OpenAPI en `/docs` fuera de producción, y Prisma.
- Ingreso por correo o teléfono: OTP de un solo uso, alta con nombre y apellido, sesión con refresh token opaco, rotación y revocación. Los tokens de acceso los firma `jose`.
- Roles sembrados y una ruta `GET /v1/admin/access` que exige MFA. El OTP no marca MFA, así que esa ruta responde prohibido. No hay panel.
- Catálogo interno de demostración, con artículos ficticios, sin precio ni existencia.
- Esquemas Zod para dinero en centavos, correo, teléfono y el ingreso.
- Pantallas mínimas de ingreso en `apps/web` (`/entrar`) y `apps/mobile`.
- Validación de entorno: en producción hacen falta `DATABASE_URL` y `AUTH_TOKEN_SECRET`. `OTP_PROVIDER=simulated` solo arranca con `NODE_ENV=development`.

## Qué está simulado

- El envío del OTP, solo si `NODE_ENV=development` y `OTP_PROVIDER=simulated`. El código es aleatorio, no sale en logs ni en la respuesta de `/v1/auth/otp/challenges`. En ese modo se consulta con `POST /v1/auth/dev/otp-code`.
- El catálogo `internal-demo`. No representa mercancía de ninguna tienda.
- El límite de tasa en memoria, de un solo proceso. No es Redis.

## Qué está bloqueado

- Compra en Amazon, Walmart, eBay y el resto de tiendas de la lista. No hay conector autorizado en este repositorio.
- Stripe, PayPal, Zelle y Pago Móvil. No hay cobros, ni de prueba.
- Despliegue. Railway está descrito y no está ejecutado.

El detalle está en `docs/API_INTEGRATIONS.md` y `docs/LEGAL_DEPENDENCIES.md`.

## Requisitos

- Node.js 22
- pnpm 10.34.9 (`corepack enable`)

## Instalación

```bash
pnpm install
pnpm typecheck
pnpm test
```

`typecheck` y `test` no usan Postgres. `/health` tampoco. `/health/ready` responde no listo si la base no está.

## Probar el OTP en local, sin leer logs

La API puede arrancar sin Postgres: si falta `DATABASE_URL`, la sesión queda en memoria. No copies un secreto al entorno.

```bash
NODE_ENV=development OTP_PROVIDER=simulated pnpm --filter @comprausa/api start
```

En otra terminal, pide un código y léelo en el endpoint de desarrollo. La primera respuesta no trae el código. La segunda sí, y solo en ese modo:

```bash
curl -s -X POST http://127.0.0.1:3001/v1/auth/otp/challenges \
  -H 'content-type: application/json' \
  -d '{"channel":"email","destination":"ana@example.com","deviceId":"00000000-0000-4000-8000-0000000000aa"}'

curl -s -X POST http://127.0.0.1:3001/v1/auth/dev/otp-code \
  -H 'content-type: application/json' \
  -d '{"channel":"email","destination":"ana@example.com"}'
```

El sitio, en `http://localhost:3000/entrar`, pide el código y no lo muestra. El móvil apunta a `http://127.0.0.1:3001`.

```bash
pnpm --filter @comprausa/web exec next dev --port 3000
```

Para guardar la sesión en Postgres:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres
pnpm --filter @comprausa/api exec prisma migrate deploy
```

## Qué falta

Cotización por enlace, catálogo comercial, pagos, compras, logística, panel y despliegue. El orden propuesto está en `docs/PROGRESS.md`.
