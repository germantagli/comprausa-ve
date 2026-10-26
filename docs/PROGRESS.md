# Avance

## En este corte

- Decisiones de stack escritas: Expo, Next.js para el sitio y para el admin, NestJS, Prisma 6.19.3, Postgres, Railway como plan.
- Documentos de arquitectura, requisitos, diseño, integraciones, seguridad, despliegue, operación y dependencias legales.
- Registro de 21 tiendas y 4 medios de pago. Ninguno está `AVAILABLE`. Ninguno se probó contra un servidor externo.
- Schema Prisma con las entidades pedidas, estados de pedido y de pago, montos en centavos y migración inicial.
- API con salud, OpenAPI fuera de producción, catálogo demo y `SimulatedOtpProvider`.
- Tokens, Zod, cliente de salud y CI de install, typecheck y test.

## Siguiente incremento

1. Persistir la cotización por enlace: guardar la URL, estado `PENDING_REVIEW`, sin fetch a la tienda y sin precio.
2. Sesión real solo después de elegir el proveedor de OTP de producción. Hasta entonces no hay refresh token emitido.
3. Pantallas mínimas de ese flujo en web, admin y móvil, con el sistema de diseño ya definido.
4. Transiciones manuales de logística en el admin, sin fechas prometidas.
5. Pagos únicamente cuando la elegibilidad esté resuelta. El primer paso, si Stripe sigue vetado para la entidad, no es integrar Stripe: es decidir el medio permitido.

No desplegar en ese incremento salvo que se pida aparte.
