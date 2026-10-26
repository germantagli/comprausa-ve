# Seguridad

Este documento fija controles de diseño. No certifica el sistema y no dice que sea invulnerable. Un atacante con tiempo, un error nuestro o una dependencia rota pueden abrir un hueco. La fase 1 casi no tiene superficie: no hay sesión, no hay pago y no hay datos reales de clientes.

Marcos de referencia, sin declaración de cumplimiento:

- OWASP ASVS, como lista de verificación de la aplicación.
- OWASP API Security Top 10, en especial BOLA y la configuración de los endpoints.
- OWASP MASVS, cuando el cliente móvil deje de ser un aviso y maneje sesión o datos.

## Identidad

El OTP tiene que ser corto, de un solo uso, con pocos intentos, con caducidad corta y con la misma respuesta si el destino no existe, si el código está mal, si venció o si se bloqueó. Hay límite de emisiones por destino. El código no se escribe en logs, ni en errores, ni en la respuesta.

`SimulatedOtpProvider` cumple esa forma solo en desarrollo y pruebas, con el código fijo `424242`, 120 segundos, 5 intentos y 3 emisiones por ventana. El constructor lanza si `NODE_ENV` es `production` o si la bandera no está permitida. No emite sesión.

Cuando haya sesión de verdad: el refresh token se guarda solo como hash, rota en cada uso, la rotación detecta reuso y revoca la cadena, y el access token vive poco. El schema ya tiene `refreshTokenHash` y `rotatedFromId`. El código que lo usa no existe.

## Autorización

Cada lectura de pedido, cotización, comprobante o dirección tiene que filtrar por el usuario autenticado o por un permiso explícito. Un id adivinado no entrega el recurso de otra persona (IDOR / BOLA). El admin no reutiliza el token del cliente. Hoy no hay recursos privados que leer.

Roles y permisos están en el schema (`Role`, `Permission`) y todavía no se siembran ni se evalúan.

## Dinero

Los montos de producto son centavos enteros. Postgres los guarda en `BigInt`. El JSON usa enteros dentro de `Number.MAX_SAFE_INTEGER`. Las tasas, si se guardan, usan `Decimal`. Está prohibido usar `float` para dinero. Zod rechaza `10.5` y rechaza strings en el monto.

La idempotencia del pago es una columna única. No se guarda PAN, CVV ni el dato crudo de banda. Un proveedor tokeniza. El webhook se acepta solo con firma válida y se procesa una vez.

Una IA, si más adelante ayuda a redactar, no confirma pagos, no cambia precios y no mueve estados de dinero. Esas acciones quedan en código determinista y en personas con permiso.

## Auditoría y operación

`AuditLog` guarda actor, acción, entidad y metadata. No se mete ahí un OTP, un token ni un PAN. Los secretos van en el entorno del proveedor, nunca en git. `.env` está ignorado. `.env.example` solo tiene marcadores vacíos y una URL local de Postgres.

En producción, `parseAppEnv` falla si falta `DATABASE_URL` o si alguien enciende el OTP simulado. OpenAPI se monta solo fuera de producción.

## API y móvil

Los endpoints futuros llevan límite de tasa, validación de entrada y errores que no cuentan si un correo está registrado. El móvil no guarda el refresh token en un sitio compartido sin cifrado del sistema, y no desactiva la verificación TLS. Esos controles se diseñan con MASVS cuando haya app de verdad. Esta fase no tiene binario firmado.

## Qué no está hecho

No hay cifrado de aplicación propio: no inventamos un cifrador. No hay WAF, no hay prueba de penetración y no hay gestión de llaves. Esas piezas se eligen cuando haya datos y pagos reales.
