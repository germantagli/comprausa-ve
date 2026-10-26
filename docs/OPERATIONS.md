# Operación

Cuatro máquinas de estado distintas. Confundirlas es el error que hay que evitar.

## Pedido

DRAFT, QUOTE_PENDING, AWAITING_PAYMENT, PAYMENT_UNDER_REVIEW, PAID, PROCUREMENT_PENDING, PURCHASED_FROM_STORE, RECEIVED_AT_US_WAREHOUSE, INTERNATIONAL_TRANSIT, CUSTOMS_PROCESSING, IN_VENEZUELA, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, REFUND_PENDING, REFUNDED, EXCEPTION.

El pedido cuenta la promesa hacia la persona. No cuenta el cobro ni el tracking del carrier.

## Pago

PENDING, PROOF_SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED, FAILED, REFUNDED, PARTIALLY_REFUNDED.

`PROOF_SUBMITTED` significa que llegó un archivo. `UNDER_REVIEW` significa que una persona lo está viendo. `VERIFIED` significa que el dinero se confirmó por un medio aceptado (webhook firmado o conciliación humana). El archivo por sí solo no llega a `VERIFIED`.

## Compra en la tienda

`Order.procurementStatus`: NOT_STARTED, PENDING, ORDERED_AT_STORE, FAILED, CANCELLED.

Un pago verificado deja este campo en `NOT_STARTED`. Alguien, o un conector futuro que hoy no existe, crea el `SupplierOrder` cuando la tienda acusa la compra. Si la tienda rechaza la compra, el pago puede estar verificado y el pedido en `EXCEPTION` o `REFUND_PENDING`. Son hechos distintos.

## Logística

`Shipment.stage`: NOT_STARTED, RECEIVED_AT_US_WAREHOUSE, INTERNATIONAL_TRANSIT, CUSTOMS_PROCESSING, IN_VENEZUELA, OUT_FOR_DELIVERY, DELIVERED, EXCEPTION.

No hay API de almacén ni de aduana. El operador mueve el pedido a mano, un paso por vez, y el evento queda con origen `MANUAL_ADMIN`, actor, nota y la hora del registro. No se calcula ni se muestra una fecha prometida. Un mensaje de carrier, el día que haya API, es otro origen (`CARRIER_API`) y tampoco se convierte en una promesa comercial si el texto no lo dice.

`Warehouse.active` nace en falso. No se inventa una bodega en Miami.

## Cotización

La persona pega un enlace. La cotización espera revisión. El operador escribe el monto en centavos o la rechaza. Hasta ese momento `quotedTotalMinor` es nulo y el pedido no pide pago.

## Lo que un operador no debe hacer

- Dar por pagado un comprobante ilegible o incompleto.
- Marcar comprado en la tienda porque el dinero entró.
- Escribir una fecha de entrega.
- Publicar un precio del catálogo demo.
- Pedirle a un asistente automático que confirme un pago o cambie un monto.
