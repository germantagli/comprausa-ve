# Seguridad

Este documento fija controles de diseño y lo que este corte ya ejecuta. No certifica el sistema y no dice que sea invulnerable. Un atacante con tiempo, un error nuestro o una dependencia rota pueden abrir un hueco. No hay cobro en vivo ni datos reales de clientes.

Marcos de referencia, sin declaración de cumplimiento:

- OWASP ASVS, como lista de verificación de la aplicación.
- OWASP API Security Top 10, en especial BOLA y la configuración de los endpoints.
- OWASP MASVS, cuando el cliente móvil deje de ser un aviso y maneje sesión o datos.

## Identidad

El OTP dura 120 segundos, acepta 5 intentos y se consume al acertar. Un destino nuevo, un código mal, un código vencido, un código reusado y un desafío bloqueado reciben el mismo `rejected`. El código no se escribe en logs, ni en el filtro de validación, ni en `POST /v1/auth/otp/challenges` ni en `POST /v1/auth/otp/verifications`.

Esas cuatro propiedades ya tienen prueba y no se duplican:

- `apps/api/src/auth/simulated-otp.provider.test.ts`: reuso después de un acierto, vencimiento a los 121 segundos, cinco intentos fallidos y el mismo rechazo para un destino desconocido.
- `apps/api/src/auth/auth.service.test.ts`: el mismo desafío y el mismo rechazo exista o no la cuenta; un código correcto se rechaza si venció o si ya hubo cinco fallos.
- `apps/api/src/auth/auth.http.test.ts`: el cuerpo HTTP de un destino conocido y el de uno desconocido son iguales, y el código no sale en el desafío ni en los logs.

El hueco que cubre `apps/api/src/commerce/security.http.test.ts` es el reuso por HTTP: el segundo envío del código ya aceptado responde `rejected` y no abre otra sesión.

`SimulatedOtpProvider` genera el código con `crypto.randomInt`. Se construye solo si `NODE_ENV=development` y `OTP_PROVIDER=simulated`. Producción y `NODE_ENV=test` lo rechazan al arrancar. Las pruebas leen el código con `peekCode()`. En ese mismo modo de desarrollo, `POST /v1/auth/dev/otp-code` devuelve el código vigente. Esa ruta no se monta en otro modo.

El límite de tasa está detrás del puerto `RateLimiter`. El adaptador de este corte es `MemoryRateLimiter`: ventana deslizante en el proceso, para desarrollo y pruebas. También queda activo si el proceso de producción arrancara, y sigue siendo memoria local. No es Redis y no se comparte entre instancias. Las claves son IP del socket, identidad (canal + destino normalizado) y `deviceId`. `trust proxy` está apagado: `X-Forwarded-For` no cambia la IP. El cupo de verificación es mayor que 5 para que un código bloqueado siga respondiendo `rejected`.

Correo y teléfono se normalizan antes de limitar y de emitir. Una cuenta nueva pide nombre y apellido, queda en rol `CUSTOMER`, locale `es-VE`, y abre sesión. Una cuenta existente abre sesión y conserva el nombre. No se piden dirección ni cédula.

La sesión guarda el refresh token solo como SHA-256. El valor opaco sale de `crypto.randomBytes`. Cada refresh rota el token: el anterior queda con `rotatedAt` y `revokedAt`. Presentar un token ya rotado revoca la familia. Cerrar sesión pone `revokedAt` en esa sesión y deja viva al resto de la familia. El access token es un JWT HS256 de 15 minutos firmado con `jose`, con `sub`, `sid`, `role` y `mfa`. El secreto de firma en producción es `AUTH_TOKEN_SECRET` (32 caracteres o más) y no puede ser el marcador de desarrollo. El alta de una cuenta nueva usa un JWT de registro de 10 minutos, de un solo uso, guardado como `RegistrationGrant` sin el OTP.

Sin `DATABASE_URL`, desarrollo y pruebas usan `MemoryAuthRepository`. Producción exige Postgres y `PrismaAuthRepository`. El cliente de Prisma no se construye si falta la URL.

## Autorización

Roles sembrados en la migración `20261026190000_auth_session`: `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `PROCUREMENT_AGENT`, `FINANCE_AGENT`, `LOGISTICS_AGENT`, `SUPPORT_AGENT`, `CUSTOMER`. La tabla `Permission` sigue vacía.

`GET /v1/admin/access` y las rutas `/v1/operator/*` exigen access token vigente y `mfaSatisfied`. El ingreso por OTP deja ese flag en falso, también si el rol no es `CUSTOMER`. Sin token o con sesión revocada responde `unauthorized`. La revisión de pagos responde `forbidden` a un cliente, a un rol que no revisa pagos y a un rol interno sin MFA. El seguimiento manual responde `forbidden` a un cliente, a `SUPPORT_AGENT` y a cualquier operador sin MFA.

El segundo factor de quien opera pagos o seguimiento es TOTP con la librería `otpauth`, después del OTP. El secreto se guarda cifrado con AES-256-GCM de Node, derivado de `AUTH_TOKEN_SECRET`. No se escribe en logs. Confirmar el código actualiza `mfaSatisfied` en la sesión y emite otro access token. El token anterior deja de coincidir con la sesión. No hay una ruta de desarrollo que ponga MFA en verdadero. En las pruebas, ese claim se escribe en la sesión desde el propio test.

En desarrollo, el correo `finanzas@comprausa.test` recibe el rol `FINANCE_AGENT` al entrar. Eso no satisface MFA. En `test` y en producción ese mapa no existe.

La cotización, el pago y el pedido de este corte viven en memoria si no hay `DATABASE_URL`. Leer una cotización, un pago o un pedido filtra por el usuario autenticado. El id de otra persona responde `not_found`, también si intenta aceptar, pagar o subir el comprobante. Un cliente no verifica un pago y no mueve la logística: esas rutas responden `forbidden`. Publicar el importe, verificar y rechazar quedan en las rutas de operador.

## Pagos y archivos

Stripe solo se construye con una clave `sk_test_`. Una clave `sk_live_` o `rk_live_` impide arrancar. Sin clave, el método responde que no está configurado y el proceso no llama a Stripe. El webhook exige la firma del SDK oficial y trata dos veces el mismo id de evento como duplicado. Las pruebas sustituyen el cliente y el verificador. No se guarda PAN ni el secreto del Payment Intent.

PayPal no captura. Zelle y Pago Móvil no tienen cuenta receptora en el repositorio: las instrucciones salen del entorno y pueden estar vacías. El importe de Pago Móvil tiene que ser el de la instantánea. Una referencia ya usada responde `duplicate_reference` y no abre otro pago. Reintentar el mismo checkout, con PayPal o con otra referencia, devuelve el pago abierto y no crea un segundo pedido ni un segundo pago. Un pago rechazado sí puede reemplazarse.

El comprobante acepta JPEG, PNG o PDF, como máximo 2 MB, y el encabezado tiene que coincidir con el tipo. El cuerpo JSON admite 4 MB para que ese tope lo aplique la API. Un tipo que no es imagen ni PDF, un encabezado que no coincide y un archivo más grande se rechazan. El archivo no se ejecuta. La clave de almacenamiento es hex aleatorio, sin el nombre original. Desarrollo lo escribe en el disco temporal del proceso. Producción usa el puerto `S3ProofStorage`, que hoy rechaza la escritura y no lee credenciales.

Subir el archivo pone el pago en `PROOF_SUBMITTED` y el pedido en `PAYMENT_UNDER_REVIEW`. Verificar lo pasa a `VERIFIED` y el pedido a `PAID`, con `procurementStatus` en `NOT_STARTED`. Eso no crea una compra en la tienda. El paso `PURCHASED_FROM_STORE` lo registra un operador, con nota y auditoría. El cuerpo del evento no trae una fecha de entrega. El aviso queda en memoria con canal interno.

## Dinero

Los montos de producto son centavos enteros. Postgres los guarda en `BigInt`. El JSON usa enteros dentro de `Number.MAX_SAFE_INTEGER`. Las tasas, si se guardan, usan `Decimal`. Está prohibido usar `float` para dinero. Zod rechaza `10.5` y rechaza strings en el monto.

La idempotencia del pago es una columna única. No se guarda PAN, CVV ni el dato crudo de banda. Un proveedor tokeniza. El webhook se acepta solo con firma válida y se procesa una vez.

Un texto de producto o un enlace pegado se guarda como texto. No se descarga, no llama a una ruta de operador y no deja un pago en `VERIFIED`. Una IA, si más adelante ayuda a redactar, no confirma pagos, no cambia precios y no mueve estados de dinero. Esas acciones quedan en código determinista y en personas con permiso.

## Auditoría y operación

`AuditLog` guarda actor, acción, entidad y metadata. El ingreso por OTP no se escribe ahí. Publicar el importe, aceptar la cotización, crear el pago, recibir el comprobante, el evento de Stripe y la verificación o el rechazo sí quedan registrados, sin OTP, sin token, sin PAN y sin los bytes del archivo. Los secretos van en el entorno del proveedor, nunca en git. `.env` está ignorado. `.env.example` no trae un `AUTH_TOKEN_SECRET` usable ni una clave de Stripe. Prisma no está en modo log de queries.

La revisión de este corte no encontró una clave viva en el árbol. Las cadenas `sk_live_not_allowed`, `sk_live_real` y `whsec_local_contract_secret` son fixtures que las pruebas rechazan o usan como contrato local; no son credenciales de un proveedor. `DEVELOPMENT_AUTH_TOKEN_SECRET` es un marcador que producción rechaza. La contraseña `comprausa` de `infrastructure/docker/docker-compose.yml` abre solo el Postgres local. `apps/api/src/security/secrets-in-repo.test.ts` falla si aparece una clave `sk_live_`, `rk_live_`, `sk_test_` usable, un `whsec_` largo, una llave privada o un token de AWS o GitHub.

En producción, `parseAppEnv` falla si falta `DATABASE_URL`, si `AUTH_TOKEN_SECRET` no alcanza 32 caracteres, si es el marcador de desarrollo, o si `OTP_PROVIDER=simulated`. OpenAPI se monta solo fuera de producción. El endpoint manual del OTP aparece en ese documento solo cuando el proveedor simulado está montado.

## API y móvil

El ingreso valida el cuerpo con Zod y responde `invalid_request` sin repetir el cuerpo. El sitio guarda la sesión en `sessionStorage` de la pestaña y el identificador de dispositivo en `localStorage`. La pantalla móvil guarda la sesión en memoria del proceso, no en un almacén compartido. No hay binario firmado y TLS se deja al entorno donde corra el cliente.

## Staging

Listo para cuando exista el entorno: la imagen de referencia en `infrastructure/docker/api.Dockerfile`, el health check de viveza `GET /health`, el de lectura `GET /health/ready`, el contrato de `parseAppEnv` y el plan `infrastructure/railway/railway.plan.toml`. Ese archivo no se llama `railway.toml`. No hay proyecto de Railway, no hay URL y este corte no desplegó.

Falta, y bloquea el staging: una cuenta y un proyecto de Railway, Postgres de staging, `DATABASE_URL` y `AUTH_TOKEN_SECRET` en el entorno del proveedor, y un proveedor real de OTP. Redis no aplica: la API no lo abre. Las claves de prueba de Stripe, el secreto de webhook y las instrucciones de Zelle y Pago Móvil siguen vacíos. El detalle está en `docs/DEPLOYMENT.md`.

## Qué no está hecho

El cifrado del secreto TOTP es AES-256-GCM de Node. La firma del access token es `jose` y el refresh es un aleatorio de Node con hash SHA-256. No hay WAF, no hay prueba de penetración y no hay gestión de llaves. No hay proveedor real de correo o SMS. El límite de tasa no cruza procesos. El pago de prueba no cobra en vivo. El almacenamiento de comprobantes en producción sigue sin credenciales. No hay despliegue.
