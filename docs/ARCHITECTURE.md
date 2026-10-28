# Arquitectura

Fecha de estas decisiones: 26 de octubre de 2026. El nombre visible es configurable (`APP_DISPLAY_NAME`, valor inicial TraeLo). La moneda de producto es USD.

## Qué existe ahora

Un monorepo que compila, un schema Prisma con la migración inicial, un contrato `ProductProvider` y un catálogo interno ficticio. La API responde salud y ese catálogo. No compra, no cobra y no promete una fecha de entrega.

## Qué queda para después

Cotización por enlace ya persistida, pagos, compra en tienda, logística, panel y despliegue. El ingreso por OTP y la sesión ya están. Redis y BullMQ se usarán cuando exista un job real. Hoy no están instalados y la API arranca sin ellos.

## Decisiones

| Tema | Elección | Por qué |
| --- | --- | --- |
| Móvil | Expo (React Native), iOS y Android | Un código nativo para las dos tiendas de aplicaciones. No se usa Expo Web para el sitio del cliente. |
| Web del cliente | Next.js | El escaparate público va a necesitar SEO. Expo Web no cubre eso bien. La lógica compartida vive en `packages/`, no en pantallas duplicadas. |
| Administración | Next.js, aplicación aparte | Otro origen, sin indexación, sin mezclarse con el escaparate. |
| API | NestJS | Módulos con límites claros y OpenAPI. |
| Datos | Prisma 6.19.3 y Postgres | Prisma 8 seguía en release candidate el 26 de octubre de 2026. Prisma 7 cambia el generador y pide adaptadores. La 6.19.3 es la última 6 estable y el schema clásico genera cliente sin adaptador. |
| TypeScript | 5.9.3 | `@nestjs/swagger` 12 declara TypeScript 5.5 o 6, no la 7. |
| Cola | Redis y BullMQ, solo previstos | El esqueleto no tiene worker. Compose deja Redis en un perfil opcional. |
| Staging | Railway | API y Postgres definidos en `.railway/railway.ts`. El vínculo y el apply del proyecto no están hechos hasta autenticar el CLI. Redis/worker quedan fuera de este corte. |
| Dinero | Centavos enteros (`BigInt` en Postgres, entero seguro en JSON) | Ni `float` ni `double`. Las tasas de cambio, si algún día existen, van en `Decimal(20, 10)` y no son un precio de venta. |
| Catálogo | Puerto `ProductProvider` | La única implementación es `InternalDemoCatalogProvider`. No hay conectores externos. |
| Identidad | Puerto `OtpProvider`, `jose` para el access token | `SimulatedOtpProvider` solo con `NODE_ENV=development` y `OTP_PROVIDER=simulated`. La sesión, la rotación y la revocación ya se emiten. |

## Monorepo

```text
apps/mobile          Expo. Consume tokens, no componentes DOM.
apps/web             Next.js. Escaparate. robots noindex hasta que haya páginas reales.
apps/admin           Next.js. Panel vacío.
apps/api             NestJS, Prisma, salud, catálogo demo, OpenAPI fuera de producción.
packages/ui          Inventario de componentes por hacer y un aviso de fase. Solo web y admin.
packages/types       Contratos: dinero, estados, ProductProvider, OtpProvider, registro de integraciones.
packages/validation  Zod: centavos USD, correo, teléfono E.164, búsqueda del catálogo demo.
packages/api-client  Cliente de GET /health y del ingreso por OTP.
packages/config      parseAppEnv y tsconfig base.
packages/design-tokens  Paleta, tipo, espacio, radio, elevación.
packages/utils       Formato de centavos con aritmética entera.
packages/testing     Respuesta JSON para pruebas.
.railway                 IaC de staging (railway.ts). Sin apply hasta autenticar.
infrastructure/railway   Notas históricas del plan; no es config activa.
infrastructure/docker    Dockerfile de la API y compose local.
infrastructure/scripts   Validación de Prisma.
docs/
```

`packages/ui` es React DOM. El móvil no lo importa: comparte tokens y, más adelante, tipos y validación.

## Límites de contexto

- Identidad: usuario, perfil, identidad, sesión, dispositivo, OTP, alta y guard de administración. El envío del código sigue simulado en desarrollo.
- Catálogo: búsqueda y ficha a través de `ProductProvider`.
- Cotización: enlace pegado, revisión humana, sin precio automático. La API guarda la URL como texto, deja la cotización en `PENDING_VALIDATION` y no la descarga. El cliente no puede pasarla a final.
- Pedido: estados propios, separados de pago, compra y envío.
- Pagos: estados propios. Stripe de prueba solo con clave `sk_test_`. PayPal sin captura. Zelle y Pago Móvil con comprobante y revisión humana.
- Logística: almacén, paquete, tracking y entrega. Sin API de carrier.
- Auditoría, soporte, reglas de precio y tasas: tablas vacías. Ninguna regla trae un monto.

## Modelo de datos

La fuente versionada es `apps/api/prisma/schema.prisma` y la migración `20261026170000_init`. UUID, `createdAt` / `updatedAt`, claves foráneas e índices en los accesos previstos (usuario, estado, idempotencia del pago).

Entidades: User, UserProfile, UserIdentity, Session, Device, Address, Role, Permission, Store, StoreIntegration, Category, Product, ProductVariant, ProductSource, ProductPriceSnapshot, Cart, CartItem, Wishlist, Quote, QuoteItem, Order, OrderItem, SupplierOrder, Payment, PaymentAttempt, PaymentProof, Refund, Shipment, Package, Warehouse, TrackingEvent, Delivery, Notification, SupportTicket, AuditLog, PricingRule, CurrencyRate, FeatureFlag. `UserRole` y `RolePermission` son las uniones.

Estados de pedido: DRAFT, QUOTE_PENDING, AWAITING_PAYMENT, PAYMENT_UNDER_REVIEW, PAID, PROCUREMENT_PENDING, PURCHASED_FROM_STORE, RECEIVED_AT_US_WAREHOUSE, INTERNATIONAL_TRANSIT, CUSTOMS_PROCESSING, IN_VENEZUELA, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, REFUND_PENDING, REFUNDED, EXCEPTION.

`Order.procurementStatus` no cambia porque un pago pase a VERIFIED. El dinero recibido no es una compra en la tienda. Después de `PAID`, un operador registra cada movimiento a mano, un paso por vez, sin fecha prometida. `PURCHASED_FROM_STORE` es esa acción. `SupplierOrder` sigue sin crearse en este corte.

Los totales del pedido y de la cotización son nulos hasta que una persona fije un monto. El catálogo demo no escribe `ProductPriceSnapshot`.

## Catálogo y enlace

`ProductProvider` expone `searchProducts`, `getProduct`, `getAvailability` y `getPricing`. El demo devuelve artículos con `fictional: true`, disponibilidad `UNKNOWN` y precio `UNPRICED`. No descarga imágenes ni usa marcas de terceros.

El flujo de enlace ya tiene endpoint: la persona pega una URL, se guarda el texto y la cotización queda pendiente de validación. Un precio faltante no se convierte en cero. El servidor no hace scraping ni llama a la tienda. La instantánea final no la dispara el cliente.

## Pagos, en arquitectura

Cuando estén permitidos:

- Stripe: Payment Intents del SDK oficial, webhook firmado e idempotencia, sin PAN. Solo con `sk_test_` en el entorno. Sin clave no se llama a Stripe. Una clave viva se rechaza. El registro de integración sigue bloqueado hasta que haya una entidad elegible.
- PayPal: puerto sin captura. No es Orders v2 en producción.
- Zelle: instrucciones configurables y comprobante. No hay API de cobro.
- Pago Móvil: banco, teléfono, referencia e importe, más el comprobante. Subirlo deja el pago en `PROOF_SUBMITTED` y el pedido en `PAYMENT_UNDER_REVIEW`. No lo pasa a `VERIFIED`. El operador verifica o rechaza. `PAID` no compra en la tienda.

Estados de pago: PENDING, PROOF_SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED, FAILED, REFUNDED, PARTIALLY_REFUNDED.

## Configuración

`parseAppEnv` exige `DATABASE_URL` y `AUTH_TOKEN_SECRET` en producción, y rechaza `OTP_PROVIDER=simulated` fuera de development. En desarrollo la base puede faltar: la sesión queda en memoria, `/health` no toca Postgres y `/health/ready` responde no listo. El proceso no construye `PrismaClient` si falta `DATABASE_URL`.

## Fuera de este corte

No hay scraping, no hay credenciales, no hay operación financiera y no hay despliegue. Una integración no se marca AVAILABLE hasta que se pruebe con credenciales legítimas.
