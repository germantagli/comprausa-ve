# Avance

## En este corte

### Pantalla 1 — Splash / Inicio (web móvil + Expo)

- Splash TraeLo con logo oficial (fondo negro), acento naranja de marca, mensaje «Compra en USA, recíbelo en Venezuela», botones **Comenzar** e **Iniciar sesión**.
- Bootstrap: recupera sesión (web `sessionStorage`, móvil SecureStore), valida/refresca contra la API, no borra credenciales si hay fallo de red.
- `GET /health` en sonda suave (timeout); no bloquea la UI. Banner si el servidor no responde.
- Rutas: web `/` (gate en `ClientShell`) → `/entrar?modo=registro|entrar`. Expo: gate en `ClientShell` → `SignInScreen`.
- API base: `NEXT_PUBLIC_API_URL` (web) y `EXPO_PUBLIC_API_URL` (Expo).

### Ya existente (otros cortes)

- Flujo móvil de maqueta posterior al splash, login OTP contra API, carrito/cotización, pago en revisión y seguimiento operador.
- OTP: Resend (email) y Twilio Verify (SMS+email). OAuth: Google y Apple vía ID token (`/v1/auth/oauth/exchanges`). En Railway OTP/OAuth quedan apagados hasta cargar client IDs y secretos.
- Commerce (carrito/pedidos/pagos) aún en memoria de proceso aunque Prisma tenga modelos.

## Siguiente incremento

1. Cargar credenciales Resend o Twilio en Railway y activar `OTP_PROVIDER`.
2. Pantalla interna para publicar precio de cotización.
3. Persistencia commerce en Postgres.
4. Pagos solo con medio elegible.

## Railway (verificado por HTTP en esta sesión)

- `https://comprausaapi-production.up.railway.app/health` → 200
- `https://comprausaapi-production.up.railway.app/health/ready` → 200 `{ "status": "ready" }`
- `https://comprausaweb-production.up.railway.app/` → 200
