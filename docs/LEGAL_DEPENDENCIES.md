# Dependencias legales y comerciales

Esto no es asesoría legal. Marca decisiones que solo puede tomar el responsable del negocio, con quien corresponda (abogado, banco, tienda, socio logístico). El esqueleto de software no las resuelve.

## No bloquean este MVP técnico

El demo, la cotización manual diseñada y el schema pueden seguir sin:

- llaves de tiendas;
- cuenta de Stripe o PayPal;
- contrato de Pago Móvil;
- socio logístico;
- ficha en App Store o Google Play.

Esas piezas no están en el código y el producto no finge tenerlas.

## Bloquean cobrar o comprar de verdad

- Entidad que opera, país de esa entidad y cuenta bancaria a su nombre.
- Elegibilidad de Stripe. El 26 de octubre de 2026 Venezuela no estaba en los enlaces de registro de `stripe.com/global`. Hasta que la entidad esté en un país soportado y Stripe active la cuenta, Stripe sigue `RESTRICTED`.
- Elegibilidad de PayPal para recibir pagos comerciales, incluido el partner local si el mercado lo pide.
- Si se quiere ofrecer Zelle, hace falta confirmación de que esa modalidad está permitida para este negocio. Si no la hay, no se ofrece.
- Un banco o procesador, si se quiere conciliar Pago Móvil sin solo mirar comprobantes. Las instrucciones de pago no se publican hasta tener la cuenta receptora.
- Términos de cada tienda sobre comprar para un tercero, revender y sacar el producto de Estados Unidos. Un API de afiliado no concede eso. Amazon Business y Lowe's piden alta de socio y, aun así, no está leído un permiso de reexportación.
- Qué mercancías se pueden importar a Venezuela y cuáles rechaza la tienda. No hay lista en este repo a propósito.
- Política de privacidad, términos de servicio y base para guardar cédula, teléfono, dirección y comprobantes.
- Tratamiento de datos de pago: no guardar PAN; el proveedor certificado es quien tokeniza.
- Nombre comercial. "CompraUSA VE" es provisional y configurable. No se hizo búsqueda de marca.
- Cuentas de desarrollador de Apple y Google, y la revisión de sus políticas sobre pagos y envíos, antes de publicar apps.
- Socio logístico en EE. UU. y en Venezuela, con responsabilidades de aduana y última milla. Sin eso no se promete entrega.
- Impuestos, percepción y facturación en las jurisdicciones que apliquen. No hay tasa cargada en `PricingRule`.

## Decisiones que el software no debe tomar solo

Precio de un enlace, aceptación de un comprobante, cambio de estado logístico, reembolso y encendido de un conector. Esas acciones quedan para una persona con permiso, o para un proveedor cuyo contrato ya se firmó.
