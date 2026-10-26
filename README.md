# CompraUSA VE

Plataforma en construcción para que una persona en Venezuela pida productos de tiendas de Estados Unidos y los reciba en Venezuela, sin administrar un casillero. El nombre es provisional y sale de `APP_DISPLAY_NAME`. La moneda de trabajo es USD.

Este repositorio es la fase 1: decisiones de arquitectura, contrato de datos y un esqueleto que compila. No hay tienda, checkout, pagos ni panel.

## Qué está de verdad

- Monorepo TypeScript (pnpm y Turborepo).
- API NestJS con `GET /health`, OpenAPI en `/docs` fuera de producción, y Prisma.
- Catálogo interno de demostración, con artículos ficticios, sin precio ni existencia.
- Esquemas Zod para dinero en centavos, correo y teléfono.
- Validación de entorno: en producción hace falta `DATABASE_URL` y el OTP simulado no arranca.

## Qué está simulado

- `SimulatedOtpProvider`, solo si `NODE_ENV` no es `production` y `SIMULATED_OTP_ENABLED=true`. El código fijo de desarrollo es `424242`. No crea sesión.
- El catálogo `internal-demo`. No representa mercancía de ninguna tienda.

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

Copia `.env.example` a `.env` solo si vas a levantar Postgres en local. Ese archivo no contiene secretos.

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres
pnpm --filter @comprausa/api exec prisma migrate deploy
pnpm --filter @comprausa/api start
```

`migrate deploy` exige la base local. `typecheck` y `test` no la usan. `/health/ready` sí la consulta y falla si está apagada. `/health` no.

## Qué falta

Pantallas, cotización por enlace, sesiones, pagos, compras, logística, administración y despliegue. El orden propuesto está en `docs/PROGRESS.md`.
