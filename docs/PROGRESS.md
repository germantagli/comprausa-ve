# Avance

## En este corte

- App de cliente en web (Next.js) y móvil (Expo), en español de Venezuela, con los tokens de `packages/design-tokens`.
- Introducción de tres pasos, una sola vez, con Continuar y Omitir. En web queda marcada en `localStorage`. En móvil queda en memoria del proceso. Se puede repetir desde Ayuda. El hueco de video está vacío: no hay archivo ni URL.
- Inicio con marca, saludo, búsqueda, acceso al carrito, categorías, tiendas destacadas, artículos del catálogo demo, aviso de compras de Estados Unidos a Venezuela y acceso a pedidos.
- Navegación inferior: Inicio, Explorar, Carrito, Pedidos y Perfil.
- Explorar lista el catálogo demo y las tiendas internas. Carrito y Pedidos muestran el vacío real. Perfil muestra el nombre de `GET /v1/account/profile` y cierra sesión.
- Categorías y tiendas internas salen de la API y hoy llegan vacías. Los artículos demo siguen marcados como ficticios. Sin precio se lee «Precio por cotización».
- El ingreso por OTP del corte anterior sigue en `/entrar` y dentro de Perfil en móvil. La sesión web no cambió de almacén.

## Siguiente incremento

1. Persistir la cotización por enlace: guardar la URL, estado `PENDING_REVIEW`, sin fetch a la tienda y sin precio.
2. Pantallas de esa cotización en web y móvil, con el sistema de diseño ya definido.
3. Transiciones manuales de logística en el admin, sin fechas prometidas. El panel sigue sin construirse.
4. Pagos únicamente cuando la elegibilidad esté resuelta. El primer paso, si Stripe sigue vetado para la entidad, no es integrar Stripe: es decidir el medio permitido.
5. Proveedor real de OTP y límite de tasa compartido entre instancias, cuando haya un entorno que lo justifique.

No desplegar en ese incremento salvo que se pida aparte.
