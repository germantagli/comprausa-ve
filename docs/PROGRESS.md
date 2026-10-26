# Avance

## En este corte

- Después de `PAID`, un operador (`SUPER_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_AGENT`, `PROCUREMENT_AGENT` o `LOGISTICS_AGENT`) avanza la compra y la logística un paso por vez. La ruta exige MFA. El cliente no cambia esos estados.
- Los estados son `PROCUREMENT_PENDING`, `PURCHASED_FROM_STORE`, `RECEIVED_AT_US_WAREHOUSE`, `INTERNATIONAL_TRANSIT`, `CUSTOMS_PROCESSING`, `IN_VENEZUELA`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED` y `EXCEPTION`. Desde `PAID` no se salta a `DELIVERED`.
- `PAID` no compra en la tienda. `PURCHASED_FROM_STORE` queda como acción del operador, con actor, fecha de registro, nota y auditoría. No hay fecha prometida.
- El cliente ve la línea de tiempo y un aviso interno. El operador ve la cola y registra el evento. El aviso no sale por email ni por push. No hay transportista ni Railway.
- Web y Expo muestran la cola, la nota y la línea de tiempo.

Sin Postgres, el pedido, el movimiento y el aviso siguen en la memoria del proceso.

## Siguiente incremento

1. Persistencia de cotización, pago, seguimiento y TOTP cuando haya Postgres en el entorno de ejecución.
2. Captura real de Stripe o PayPal solo si una entidad elegible confirma el medio. Hasta entonces la clave de prueba no se versiona.
3. Proveedor real de OTP y límite de tasa compartido entre instancias.
4. El resto del panel de administración sigue sin construirse.

No desplegar en ese incremento salvo que se pida aparte.
