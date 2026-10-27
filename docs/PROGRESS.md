# Avance

## En este corte

- Flujo móvil de maqueta (viewport estrecho): splash → bienvenida → inicio → tiendas → búsqueda/filtros → ficha → carrito → dirección → pago → resumen → seguimiento → perfil, con login/logout contra la API.
- OTP simulado solo en local (`NODE_ENV=development`, `OTP_PROVIDER=simulated`). En producción el login llama a la API y el código solo llega con proveedor real; sin bypass.
- Ficha del artículo demo: etiqueta Ficticio; precio de maqueta marcado como no real, o «Precio por cotización». Hay «Agregar al carrito» y «Comprar ahora».
- Tiendas de referencia en texto (sin logos). Carrito API + pasos de checkout de maqueta sin cobro (`/direccion`, `/pago`, `/resumen`).
- Dirección en Venezuela también alimenta la cotización real del carrito. Pegar un enlace guarda la URL como texto.
- Si falta un precio, la cotización queda `PENDING_VALIDATION`. Montos en enteros menores. Sin Postgres, carrito/cotización viven en memoria del proceso.

## Siguiente incremento

1. Pantalla interna para que el sistema escriba un precio y, solo entonces, cierre la cotización final. El cliente sigue sin ese botón.
2. Transiciones manuales de logística en el admin, sin fechas prometidas. El panel sigue sin construirse.
3. Pagos únicamente cuando la elegibilidad esté resuelta. El primer paso, si Stripe sigue vetado para la entidad, no es integrar Stripe: es decidir el medio permitido.
4. Proveedor real de OTP y límite de tasa compartido entre instancias, cuando haya un entorno que lo justifique.
5. Aplicar `.railway/railway.ts` en Railway (login o token), dominio público de la API y `AUTH_TOKEN_SECRET` de staging.

La definición de staging ya está en el repo (IaC + Dockerfile + workflow de config). Falta autenticar Railway para el apply.
