# Avance

## En este corte

### Solicitudes y cotizaciones (persistidas)

- Flujo real `ProductRequest` / `ProductQuote` / historial / inbox en Prisma (`TRS-######`, montos en centavos USD).
- API cliente + staff (`StaffGuard`, sin MFA para cotizar; pagos siguen con MFA).
- Misma app TraeLo: `/solicitar`, `/mis-cotizaciones`, `/notificaciones`, `/admin/*` (no hay segundo sitio admin).
- Aceptar cotización → pedido pendiente de pago (no se marca pagado). Migración `20261030220000_product_requests` lista; **no aplicar en producción sin aprobación**.

### Pantalla 1 — Splash / Inicio (web móvil + Expo)

- Splash TraeLo con logo oficial (fondo negro), acento naranja de marca, mensaje «Compra en USA, recíbelo en Venezuela», botones **Comenzar** e **Iniciar sesión**.
- Bootstrap: recupera sesión (web `sessionStorage`, móvil SecureStore), valida/refresca contra la API, no borra credenciales si hay fallo de red.
- `GET /health` en sonda suave (timeout); no bloquea la UI. Banner si el servidor no responde.
- Rutas: web `/` (gate en `ClientShell`) → `/entrar?modo=registro|entrar`. Expo: gate en `ClientShell` → `SignInScreen`.
- API base: `NEXT_PUBLIC_API_URL` (web) y `EXPO_PUBLIC_API_URL` (Expo).

### Ya existente (otros cortes)

- Flujo móvil de maqueta posterior al splash, login OTP contra API, carrito/cotización, pago en revisión y seguimiento operador.
- OTP email (Resend). SMS/teléfono oculto en clientes (`PHONE_OTP_ENABLED=false`). OAuth Google y Apple. En Railway OTP/OAuth quedan apagados hasta cargar secretos/client IDs.
- Commerce (carrito/pedidos/pagos) aún en memoria de proceso aunque Prisma tenga modelos.

## Siguiente incremento

1. Aprobar y aplicar migración de solicitudes en Postgres/Railway.
2. Integración real de pagos para pedidos nacidos de cotización aceptada.
3. Cargar Resend + Google/Apple client IDs en Railway.
4. Persistencia commerce (carrito) en Postgres.

## Railway (verificado por HTTP en esta sesión)

- `https://comprausaapi-production.up.railway.app/health` → 200
- `https://comprausaapi-production.up.railway.app/health/ready` → 200 `{ "status": "ready" }`
- `https://comprausaweb-production.up.railway.app/` → 200
