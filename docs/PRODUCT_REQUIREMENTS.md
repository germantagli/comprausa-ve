# Requisitos de producto

Nombre: TraeLo. Moneda: USD. Clientes en Venezuela. Compra en tiendas de Estados Unidos y entrega en Venezuela, sin que la persona administre un casillero.

Esto no es asesoría legal ni una oferta comercial. Los montos, el inventario y las fechas no existen todavía.

## MVP de producto (todavía no construido)

El MVP de cara al público, cuando se construya, debe permitir:

1. Crear una cuenta con un OTP de un solo uso. El alta con nombre y apellido ya abre sesión. El envío del código sigue simulado y solo en desarrollo.
2. Pegar un enlace de un producto y pedir una cotización manual.
3. Ver que la cotización no tiene precio hasta que una persona del equipo lo escriba.
4. Ver el estado del pedido separado del estado del pago y del estado de la compra en la tienda.
5. Si el medio de pago manual está permitido, subir un comprobante y ver que sigue sin confirmarse.
6. Recorrer el pedido en iOS, Android y web con la misma información.

Criterios de aceptación de ese MVP, para cuando se implemente:

- Ningún artículo del catálogo demo se puede pagar.
- Un enlace pegado no dispara una compra ni una consulta automática a la tienda.
- Un pago `VERIFIED` deja la compra en tienda en `NOT_STARTED` hasta un acto distinto.
- No se muestra una fecha de entrega.
- Los montos viajan en centavos enteros USD.
- El texto de marca de una tienda, si aparece, es el enlace que pegó la persona, no un catálogo nuestro con sus imágenes.

## Qué acepta esta fase

- `pnpm install`, `pnpm typecheck` y `pnpm test` pasan en este corte.
- `GET /health` declara catálogo `internal-demo`, pagos `not_configured` y tiendas `no_external_connector`.
- `GET /v1/catalog/products` solo devuelve piezas ficticias, sin precio ni existencia.
- El schema contiene las entidades y los estados pedidos, con migración inicial.
- Producción no arranca sin `DATABASE_URL` y no admite OTP simulado.

## Qué no entra todavía

- Pantallas de tienda, carrito, checkout y cuenta.
- Stripe, PayPal, Zelle y Pago Móvil, incluso en modo de prueba.
- Conectores de tiendas, afiliados y scraping.
- Sesiones, refresh tokens y dispositivos reales.
- Worker, Redis obligatorio, correos y push.
- Panel para mover logística.
- Despliegue a Railway o a las tiendas de aplicaciones.
- Precios, descuentos, inventario, tasas de cambio y fechas de entrega.
- Cualquier promesa de que un producto se puede importar.

## Catálogo de demostración

Sirve para compilar el contrato. Los artículos se llaman Caja de demostración Norte, Sobre de demostración Centro y Kit de demostración Sur. No se venden. No llevan marca, imagen, precio ni stock.

## Cotización por enlace

La persona pega una URL. El sistema, en un incremento posterior, guardará la URL y abrirá una cotización `PENDING_REVIEW`. Nadie de software inventa el precio. Un operador revisa el enlace, escribe el monto o rechaza la cotización, y solo entonces el pedido puede pasar a esperar pago. Si la tienda no tiene conector, este flujo es el camino del producto, no un parche temporal escondido.
