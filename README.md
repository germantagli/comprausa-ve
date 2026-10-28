# TraeLo

Plataforma en construcción para que una persona en Venezuela pida productos de tiendas de Estados Unidos y los reciba en Venezuela, sin administrar un casillero. El nombre visible sale de `APP_DISPLAY_NAME` (TraeLo). La moneda de trabajo es USD.

Este repositorio tiene la arquitectura de la fase 1, el ingreso por OTP, la app de cliente y el pago en revisión. No hay compra en tienda ni panel completo.

## Qué está de verdad

- Monorepo TypeScript (pnpm y Turborepo).
- API NestJS con `GET /health`, OpenAPI en `/docs` fuera de producción, y Prisma.
- Ingreso por correo o teléfono: OTP de un solo uso, alta con nombre y apellido, sesión con refresh token opaco, rotación y revocación. Los tokens de acceso los firma `jose`.
- Roles sembrados y una ruta `GET /v1/admin/access` que exige MFA. El OTP no marca MFA, así que esa ruta responde prohibido. No hay panel.
- Catálogo interno de demostración, con artículos ficticios, sin precio ni existencia.
- Esquemas Zod para dinero en centavos, correo, teléfono y el ingreso.
- App de cliente en `apps/web` y `apps/mobile`: introducción, inicio, explorar, carrito, pedidos y perfil. El ingreso sigue en `/entrar`.
- Validación de entorno: en producción hacen falta `DATABASE_URL` y `AUTH_TOKEN_SECRET`. `OTP_PROVIDER=simulated` solo arranca con `NODE_ENV=development`. Producción admite `resend` (email) o `twilio` (SMS + email vía Verify) con sus secretos.
- Proveedores OTP reales cableados: `ResendOtpProvider` y `TwilioVerifyOtpProvider`. Sin credenciales, `OTP_PROVIDER=none` y el challenge responde 503.

## Qué está simulado

- El envío del OTP, solo si `NODE_ENV=development` y `OTP_PROVIDER=simulated`. El código es aleatorio, no sale en logs ni en la respuesta de `/v1/auth/otp/challenges`. En ese modo se consulta con `POST /v1/auth/dev/otp-code`.
- El catálogo `internal-demo`. No representa mercancía de ninguna tienda.
- El límite de tasa en memoria, de un solo proceso. No es Redis.

## Qué está bloqueado

- Compra en Amazon, Walmart, eBay y el resto de tiendas de la lista. No hay conector autorizado en este repositorio.
- Stripe, PayPal, Zelle y Pago Móvil. No hay cobros, ni de prueba.
- Despliegue. Railway está definido en `.railway/railway.ts` y todavía no está vinculado ni aplicado.

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

El sitio, en `http://127.0.0.1:3000`, en viewport estrecho abre el splash TraeLo (fondo blanco, marca en azul) con **Comenzar** e **Iniciar sesión** (nunca el buscador primero). Ambos llevan a registro/OTP (`/entrar`); si hay sesión válida se omite el splash. El health check del API no bloquea la entrada. Tras entrar ves bienvenida (si aplica) e inicio. En escritorio el chrome ancho sigue disponible sin pasar por el splash de teléfono.

Expo (`apps/mobile`) usa el mismo splash y restaura la sesión desde SecureStore. Configura `EXPO_PUBLIC_API_URL` según el entorno (Simulator, `10.0.2.2` en emulador Android, IP LAN o Railway en dispositivo físico).

En desarrollo, `/entrar` puede rellenar el OTP llamando a `POST /v1/auth/dev/otp-code` solo si `NODE_ENV=development` y la API arrancó con `OTP_PROVIDER=simulated`. En la web pública (Railway / producción) ese endpoint no existe: el login sigue llamando a la API; el código llega con `OTP_PROVIDER=resend` o `OTP_PROVIDER=twilio` y las variables del proveedor. No hay bypass de producción (`OTP_PROVIDER=simulated` se rechaza fuera de development).

Para activar email real (Resend, free tier) o SMS (Twilio Verify), ver `.env.example` y poner las variables en Railway.

```bash
pnpm --filter @comprausa/web exec next dev --port 3000
```

Para guardar la sesión en Postgres:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres
pnpm --filter @comprausa/api exec prisma migrate deploy
```

## Qué falta

Compra en tienda, logística, el resto del panel y despliegue. La cotización final la publica un operador y el comprobante queda en revisión. El orden propuesto está en `docs/PROGRESS.md`.
