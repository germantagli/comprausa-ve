# Integraciones

Revisión del 26 de octubre de 2026. Ninguna llamada a estas APIs se ejecutó. Ninguna credencial está en el repositorio. Estar en la lista de tiendas no crea un conector.

Estados:

- `AVAILABLE`: conector autorizado, implementado y probado. Hoy no hay ninguno.
- `PENDING_CREDENTIALS`: la API pública cubre la compra en nombre del proyecto y solo faltan llaves. Hoy no hay ninguno.
- `REQUIRES_PARTNERSHIP`: existe un programa oficial, pero pide aprobación comercial. No está probado y no autoriza por sí solo el reenvío a Venezuela.
- `RESTRICTED`: no hay conector de compra que podamos usar. Un programa de afiliados o un API de vendedor no cuentan como compra.
- `DISABLED`: apagado a propósito. Hoy no se usa: no llegamos a encender nada.

El MVP no depende de estas tiendas. El catálogo vivo es el interno de demostración. El otro camino es pegar un enlace y cotizar a mano.

El registro corto está en `packages/types` (`storeIntegrationRegistry` y `paymentIntegrationRegistry`). Todos los registros están en modo `BLOCKED`.

## Tiendas

### Amazon — `REQUIRES_PARTNERSHIP`

La Creators API es el sucesor del Product Advertising API 5.0, que Amazon marca como deprecado. Las operaciones públicas de catálogo son SearchItems, GetItems, GetVariations y GetBrowseNodes. Piden cuenta de Associates y credenciales. Eso es afiliación, no una compra hecha por nosotros.

La Ordering API de Amazon Business (`placeOrder` y `orderDetails`) existe para que un sistema de compras de una empresa coloque pedidos de sus propios usuarios de Amazon Business, con OAuth. Hay que completar el alta de socio. La documentación describe la compra de esa empresa, no un servicio que compre para un consumidor en Venezuela y exporte el paquete.

Fuentes: [Creators API](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction), [aviso de PA-API 5](https://webservices.amazon.com/paapi5/documentation/), [Ordering API](https://docs.business.amazon.com/docs/ordering-api-overview). Consultadas el 26 de octubre de 2026.

### Walmart — `RESTRICTED`

El Affiliate Marketing API sirve para mostrar productos y ganar una referencia. El Marketplace API es para vendedores y proveedores de soluciones: inventario, precio y pedidos de lo que ellos venden en Walmart.

En octubre de 2026 Walmart describió perfiles de agente dentro de la cuenta del propio cliente, con aprobación del cliente y sin entregar el número de tarjeta al agente. Eso no es un API público para que un consolidador compre y saque la mercancía del país.

Fuentes: [Affiliate API](https://walmart.io/apidocs/affiliates/introduction), [Marketplace](https://developer.walmart.com/us-marketplace/docs/introduction-to-marketplace-apis), [nota de agentes](https://corporate.walmart.com/news/2026/10/Making-It-Possible-for-Agents-to-Shop-on-Behalf-of-Customers).

### eBay — `REQUIRES_PARTNERSHIP`

La red de socios describe Browse, Feed y Marketing como explorables con cuenta de desarrollador, y la Order API como cierre de compra que exige una solicitud y, si se toca dato de tarjeta, PCI DSS. `developer.ebay.com` respondió 403 desde este entorno el 26 de octubre de 2026, así que no se cita un contrato OpenAPI leído de ahí. Un formulario de la red de socios indica que el acceso a Order API, Offer API y Marketplace Insights no se concede por esa solicitud ordinaria.

No integramos Browse ni Order. Browse no compra.

Fuentes: [Buy APIs en la Partner Network](https://partnernetwork.ebay.com.au/solutions/meet-the-buy-apis-let-your-visitors-shop-purchase-and-track-orders-without-ever-leaving-your-site), [cuestionario de acceso restringido](https://partnernetwork.ebay.de/page/developer-questionnaire).

### Target — `RESTRICTED`

El sitio oficial encontrado es el programa de afiliados Target Partners. No apareció un API de compra.

Fuente: [partners.target.com](https://partners.target.com/).

### SHEIN — `RESTRICTED`

La plataforma abierta es de vendedores: publicar producto, preparar stock y cumplir pedidos. No es una API para comprar en SHEIN por otra persona.

Fuente: [open.sheincorp.com](https://open.sheincorp.com/).

### Temu — `RESTRICTED`

La Partner Platform documenta un router para ISV de tiendas Temu (la página revisada dice actualización del 26 de enero de 2025). El programa de afiliados paga por enlaces. Ninguno de los dos compra por el usuario.

Fuentes: [documentación de endpoints](https://partner.temu.com/documentation?menu_code=38e79b35d2cb463d85619c1c786dd303&sub_menu_code=8311de2b2d434e4d805e88413ab815d8), [afiliados](https://www.temu.com/affiliate_seeding_entry.html).

### Nike — `RESTRICTED`

La página pública de ayuda describe el programa de afiliados. No se encontró un API de compra.

Fuente: [Nike Affiliate Program](https://www.nike.com/us/en/help/a/nike-affiliate-program).

### Adidas — `RESTRICTED`

No se confirmó un portal público de compra. El nombre `developer.adidas.com` no resolvió el 26 de octubre de 2026. Eso solo descarta esa URL, no un convenio futuro.

### Best Buy — `RESTRICTED`

El Products API es un catálogo de lectura (precio y disponibilidad incluidos en la documentación) con una llave. No coloca un pedido. La nota sobre música y cine empuja al programa de afiliados. No se usa en este repositorio.

Fuente: [Products API](https://developer.bestbuy.com/documentation/products-api).

### Apple — `RESTRICTED`

Apple Developer es para construir software y distribuir apps. No es un API para comprar el inventario de la tienda Apple y reexportarlo. No se encontró ese conector.

### Samsung — `RESTRICTED`

`developer.samsung.com` responde y es el sitio de plataformas Samsung. En esta revisión no apareció un API para comprar el catálogo minorista de Samsung en nombre de un tercero.

### Sephora — `RESTRICTED`

El portal de desarrolladores dice que el acceso está restringido y no está abierto al público.

Fuente: [developer.sephora.com](https://developer.sephora.com/).

### Ulta Beauty — `RESTRICTED`

Hay una página de afiliados. No se encontró un API de compra.

Fuente: [ulta.com/company/affiliates](https://www.ulta.com/company/affiliates).

### Macy's — `RESTRICTED`

`developer.macys.com/docs` pidió inicio de sesión o no tenía contenido público el 26 de octubre de 2026. Sin documentación legible y sin prueba, no se trata como conector.

### Home Depot — `RESTRICTED`

`developer.homedepot.com` no resolvió el 26 de octubre de 2026. No se usa un inventario de terceros como si fuera documentación de Home Depot. No hay conector de compra identificado.

### Lowe's — `REQUIRES_PARTNERSHIP`

El Developer Hub público describe catálogo, inventario y pedidos para socios que venden productos Lowe's en su propia plataforma, con registro de la organización y credenciales. No se llamó ningún endpoint y el texto no autoriza el envío a Venezuela.

Fuente: [developer.lowes.com/portal](https://developer.lowes.com/portal/).

### Etsy — `RESTRICTED`

Open API v3 cubre la tienda del vendedor, sus listings y los recibos de esa tienda. La ayuda oficial distingue apps de vendedor, personales y de acceso comercial para herramientas de vendedores. No hay checkout de comprador para este producto.

Fuentes: [How to Use Etsy’s API](https://help.etsy.com/hc/en-us/articles/360025870013-How-to-Use-Etsy-s-API), [etsy/open-api](https://github.com/etsy/open-api).

### H&M — `RESTRICTED`

No se confirmó un API público de compra. `developer.hm.com` no resolvió el 26 de octubre de 2026.

### Zara — `RESTRICTED`

No se encontró un API público para comprar en Zara en nombre de otra persona.

### Foot Locker — `RESTRICTED`

El sitio comercial responde. No se encontró documentación de un API de compra.

### Costco — `RESTRICTED`

El sitio comercial responde. Costco exige membresía para comprar. No se encontró un API público de compra para terceros.

## Pegar un enlace

Mientras una tienda no tenga conector `AVAILABLE` y probado, el producto no la consulta. La persona pega la URL. Un operador abre el enlace, decide si se puede cotizar y escribe el monto o rechaza. El software no descarga la página, no adivina el precio y no crea un `SupplierOrder`.

## Pagos

Ninguno está integrado. Subir un comprobante no verifica un pago. No hay modo de prueba activo.

### Stripe — `RESTRICTED`

El diseño previsto es Payment Intents, webhooks firmados, idempotencia y ningún PAN guardado por nosotros. Stripe deja probar el sandbox después de crear una cuenta, y el modo live pide verificar el negocio. El país de origen no se cambia después de activar el servicio.

El 26 de octubre de 2026, el HTML de [stripe.com/global](https://stripe.com/global) listaba 44 enlaces de registro (`register?country=`). Venezuela no estaba. La misma página dice que Payments no está disponible para un negocio fuera de un país o región soportada. Por eso Stripe queda bloqueado hasta que una entidad elegible exista y alguien confirme el alta. No se enciende ni el modo de prueba en este corte.

Fuentes: [disponibilidad](https://stripe.com/global), [Payment Intents](https://docs.stripe.com/payments/payment-intents), [webhooks](https://docs.stripe.com/webhooks), [alta de cuenta](https://docs.stripe.com/get-started/account/set-up).

### PayPal — `REQUIRES_PARTNERSHIP`

Orders v2 es el API oficial de checkout. PayPal publica sitio de negocios para Venezuela y, a la vez, dice que recibir fondos puede exigir un partner local con licencia y que los servicios cambian según el mercado. No se abrió una cuenta ni se creó una orden. Hace falta una decisión de elegibilidad antes de escribir código de cobro.

Fuentes: [Orders v2](https://developer.paypal.com/api/orders/v2), [PayPal VE negocios](https://www.paypal.com/ve/business), [recibir fondos](https://www.paypal.com/ve/cshelp/article/%C2%BFc%C3%B3mo-hago-para-recibir-dinero-a-trav%C3%A9s-de-paypal-help667).

### Zelle — `RESTRICTED`

Zelle explica el cobro de un pequeño negocio dentro de la app de su banco, en Estados Unidos. No publica un API de comercio para cualquier empresa. Hay APIs de desembolsos de bancos concretos (por ejemplo U.S. Bank y J.P. Morgan) para clientes de esos bancos, con cuenta en EE. UU. No son un conector de Zelle que este proyecto pueda asumir.

Un flujo manual solo se diseñará si una revisión de cumplimiento dice que la modalidad está permitida. No está en el esqueleto.

Fuentes: [Zelle for Businesses](https://www.zelle.com/business), [red para instituciones](https://www.zelle.com/join-zelle-network/partners).

### Pago Móvil — `REQUIRES_PARTNERSHIP`

Es un canal interbancario de la banca venezolana. Suiche 7B lo describe como pago inmediato persona a persona, persona a comercio y comercio a persona, asociado al teléfono. El BCV publica el marco de sistemas de pago; la página consultada no entregó un API nacional de conciliación. No existe una sola API pública a la que este proyecto pueda conectarse.

El comportamiento de producto, cuando el negocio tenga una cuenta receptora permitida, será: instrucciones configurables (banco, teléfono, RIF), carga de comprobante y revisión humana. El comprobante no confirma el pago. La conciliación automática queda para un contrato con un banco o un procesador. No se copian tarifas: el BCV las publica y cambian.

Un PDF de términos de un banco, de 2023, no se usa como permiso ni como especificación nacional.

Fuentes: [preguntas de Suiche 7B](https://suiche7b.com.ve/?page_id=29149), [sistemas de pago del BCV](https://www.bcv.org.ve/marco/seccion-marco-juridico/sistemas-de-pago).

## Qué faltaría para mover un estado

- Credenciales emitidas a nombre del responsable del producto, fuera de git.
- Un texto del programa que cubra comprar para un tercero y entregar en Venezuela, o un no explícito.
- Una prueba de sandbox hecha por nosotros, con el resultado guardado.
- Para pagos, la entidad, el país de la cuenta y el visto bueno para operar.

Hasta entonces el estado no pasa a `AVAILABLE`.
