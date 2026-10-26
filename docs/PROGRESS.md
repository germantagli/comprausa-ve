# Avance

## En este corte

- Decisiones de stack escritas: Expo, Next.js para el sitio y para el admin, NestJS, Prisma 6.19.3, Postgres, Railway como plan.
- Documentos de arquitectura, requisitos, diseño, integraciones, seguridad, despliegue, operación y dependencias legales.
- Registro de 21 tiendas y 4 medios de pago. Ninguno está `AVAILABLE`. Ninguno se probó contra un servidor externo.
- Schema Prisma con las entidades pedidas, estados de pedido y de pago, montos en centavos y migración inicial.
- API con salud, OpenAPI fuera de producción, catálogo demo e ingreso por OTP.
- Sesión con rotación de refresh token, revocación, dispositivo y guard de administración que exige MFA. Roles sembrados. Sin panel.
- OTP simulado solo en desarrollo, con lectura del código por `peekCode()` y por `POST /v1/auth/dev/otp-code`. Límite de tasa en memoria.
- Pantallas mínimas de ingreso en web (`/entrar`) y móvil.
- Tokens, Zod, cliente de salud y de ingreso, y CI de install, typecheck y test. Las pruebas de auth no levantan Postgres.

## Siguiente incremento

1. Persistir la cotización por enlace: guardar la URL, estado `PENDING_REVIEW`, sin fetch a la tienda y sin precio.
2. Pantallas de esa cotización en web y móvil, con el sistema de diseño ya definido.
3. Transiciones manuales de logística en el admin, sin fechas prometidas. El panel sigue sin construirse.
4. Pagos únicamente cuando la elegibilidad esté resuelta. El primer paso, si Stripe sigue vetado para la entidad, no es integrar Stripe: es decidir el medio permitido.
5. Proveedor real de OTP y límite de tasa compartido entre instancias, cuando haya un entorno que lo justifique.

No desplegar en ese incremento salvo que se pida aparte.
