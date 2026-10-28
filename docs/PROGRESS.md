# Avance

## En este corte

- Flujo móvil de maqueta (viewport estrecho): splash → bienvenida → inicio → tiendas → búsqueda/filtros → ficha → carrito → dirección → pago → resumen → seguimiento → perfil, con login/logout contra la API.
- OTP simulado solo en local (`NODE_ENV=development`, `OTP_PROVIDER=simulated`). En producción el login llama a la API y el código solo llega con proveedor real; sin bypass.
- Ficha del artículo demo: etiqueta Ficticio; precio de maqueta marcado como no real, o «Precio por cotización». Hay «Agregar al carrito» y «Comprar ahora».
- Tiendas de referencia en texto (sin logos). Carrito API + pasos de checkout de maqueta sin cobro (`/direccion`, `/pago`, `/resumen`).
- Dirección en Venezuela también alimenta la cotización real del carrito. Pegar un enlace guarda la URL como texto.
- Si falta un precio, la cotización queda `PENDING_VALIDATION`. Montos en enteros menores. Sin Postgres, carrito/cotización viven en memoria del proceso.
- Después de `PAID`, un operador (`SUPER_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_AGENT`, `PROCUREMENT_AGENT` o `LOGISTICS_AGENT`) avanza la compra y la logística un paso por vez. La ruta exige MFA. El cliente no cambia esos estados.
- Los estados son `PROCUREMENT_PENDING`, `PURCHASED_FROM_STORE`, `RECEIVED_AT_US_WAREHOUSE`, `INTERNATIONAL_TRANSIT`, `CUSTOMS_PROCESSING`, `IN_VENEZUELA`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` y `EXCEPTION`. Desde `PAID` no se salta a `DELIVERED`.
- `PAID` no compra en la tienda. `PURCHASED_FROM_STORE` queda como acción del operador, con actor, fecha de registro, nota y auditoría. No hay fecha prometida.
- El cliente ve la línea de tiempo y un aviso interno. El operador ve la cola y registra el evento. El aviso no sale por email ni por push.
- Web y Expo muestran la cola de pagos, la nota y la línea de tiempo. Sin Postgres, pedido, movimiento y aviso siguen en la memoria del proceso.

## Siguiente incremento

1. Pantalla interna para que el sistema escriba un precio y, solo entonces, cierre la cotización final. El cliente sigue sin ese botón.
2. Persistencia de cotización, pago, seguimiento y TOTP cuando haya Postgres en el entorno de ejecución.
3. Pagos únicamente cuando la elegibilidad esté resuelta. El primer paso, si Stripe sigue vetado para la entidad, no es integrar Stripe: es decidir el medio permitido. Hasta entonces la clave de prueba no se versiona.
4. Proveedor real de OTP y límite de tasa compartido entre instancias, cuando haya un entorno que lo justifique.
5. El resto del panel de administración sigue sin construirse.

La definición de staging ya está en el repo (IaC + Dockerfile + workflow de config). API y web ya están publicadas en Railway; falta OTP real en ese entorno.
