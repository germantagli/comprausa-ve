# Avance

## En este corte

### Pantalla 1 — Splash / Inicio (web móvil + Expo)

- Splash con marca TraeLo, fondo blanco, azul primario, mensaje «Compra en USA, recíbelo en Venezuela», botones **Comenzar** e **Iniciar sesión**.
- Bootstrap: recupera sesión (web `sessionStorage`, móvil SecureStore), valida/refresca contra la API, no borra credenciales si hay fallo de red.
- `GET /health` en sonda suave (timeout); no bloquea la UI. Banner si el servidor no responde.
- Rutas: web `/` (gate en `ClientShell`) → `/entrar?modo=registro|entrar`. Expo: gate en `ClientShell` → `SignInScreen`.
- API base: `NEXT_PUBLIC_API_URL` (web) y `EXPO_PUBLIC_API_URL` (Expo).

### Ya existente (otros cortes)

- Flujo móvil de maqueta posterior al splash, login OTP contra API, carrito/cotización, pago en revisión y seguimiento operador.
- OTP simulado solo en local. En Railway: `GET /health` y `/health/ready` verificados (API viva + Postgres ready); `otp: not_configured`.
- Commerce (carrito/pedidos/pagos) aún en memoria de proceso aunque Prisma tenga modelos.

## Siguiente incremento

1. **Pantalla 2 — Registro / Login** (contratos OTP reales, proveedor configurado).
2. Pantalla interna para publicar precio de cotización.
3. Persistencia commerce en Postgres.
4. Pagos solo con medio elegible; OTP real en producción.

## Railway (verificado por HTTP en esta sesión)

- `https://comprausaapi-production.up.railway.app/health` → 200
- `https://comprausaapi-production.up.railway.app/health/ready` → 200 `{ "status": "ready" }`
- `https://comprausaweb-production.up.railway.app/` → 200
