# Avance

## En este corte

- Ficha del artículo demo en web y móvil: fotos, nombre, marca, tienda, variantes y disponibilidad solo con el dato que existe. Sin precio se lee «Precio por cotización». Hay «Agregar al carrito» y «Comprar ahora».
- La búsqueda de Inicio abre Explorar con el mismo texto. El único filtro es el nombre, porque el catálogo demo no trae marca, tienda ni precio.
- Carrito con cantidad, eliminar, guardar para después y grupo por tienda. Los artículos demo quedan en «Sin tienda». El subtotal suma solo centavos conocidos. Un precio desconocido no entra como cero.
- Dirección en Venezuela (estado, ciudad, municipio y punto de referencia) para pedir la cotización.
- Pegar un enlace guarda la URL como texto y abre una línea manual. El servidor no descarga esa URL.
- Si falta un precio, la cotización queda `PENDING_VALIDATION`. El cliente ve el estado y no puede marcarla como pagada ni final. La instantánea inmutable solo la escribe `finalizeBySystem` cuando todos los centavos existen.
- Montos en enteros menores. Sin Postgres, el carrito y la cotización viven en memoria del proceso.

## Siguiente incremento

1. Pantalla interna para que el sistema escriba un precio y, solo entonces, cierre la cotización final. El cliente sigue sin ese botón.
2. Transiciones manuales de logística en el admin, sin fechas prometidas. El panel sigue sin construirse.
3. Pagos únicamente cuando la elegibilidad esté resuelta. El primer paso, si Stripe sigue vetado para la entidad, no es integrar Stripe: es decidir el medio permitido.
4. Proveedor real de OTP y límite de tasa compartido entre instancias, cuando haya un entorno que lo justifique.
5. Aplicar `.railway/railway.ts` en Railway (login o token), dominio público de la API y `AUTH_TOKEN_SECRET` de staging.

La definición de staging ya está en el repo (IaC + Dockerfile + workflow de config). Falta autenticar Railway para el apply.
