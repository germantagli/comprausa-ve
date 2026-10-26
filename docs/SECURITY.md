# Seguridad

Este documento fija controles de diseño y lo que este corte ya ejecuta. No certifica el sistema y no dice que sea invulnerable. Un atacante con tiempo, un error nuestro o una dependencia rota pueden abrir un hueco. No hay pago ni datos reales de clientes.

Marcos de referencia, sin declaración de cumplimiento:

- OWASP ASVS, como lista de verificación de la aplicación.
- OWASP API Security Top 10, en especial BOLA y la configuración de los endpoints.
- OWASP MASVS, cuando el cliente móvil deje de ser un aviso y maneje sesión o datos.

## Identidad

El OTP dura 120 segundos, acepta 5 intentos y se consume al acertar. Un destino nuevo, un código mal, un código vencido, un código reusado y un desafío bloqueado reciben el mismo `rejected`. El código no se escribe en logs, ni en el filtro de validación, ni en `POST /v1/auth/otp/challenges` ni en `POST /v1/auth/otp/verifications`.

`SimulatedOtpProvider` genera el código con `crypto.randomInt`. Se construye solo si `NODE_ENV=development` y `OTP_PROVIDER=simulated`. Producción y `NODE_ENV=test` lo rechazan al arrancar. Las pruebas leen el código con `peekCode()`. En ese mismo modo de desarrollo, `POST /v1/auth/dev/otp-code` devuelve el código vigente. Esa ruta no se monta en otro modo.

El límite de tasa está detrás del puerto `RateLimiter`. El adaptador de este corte es `MemoryRateLimiter`: ventana deslizante en el proceso, para desarrollo y pruebas. También queda activo si el proceso de producción arrancara, y sigue siendo memoria local. No es Redis y no se comparte entre instancias. Las claves son IP del socket, identidad (canal + destino normalizado) y `deviceId`. `trust proxy` está apagado: `X-Forwarded-For` no cambia la IP. El cupo de verificación es mayor que 5 para que un código bloqueado siga respondiendo `rejected`.

Correo y teléfono se normalizan antes de limitar y de emitir. Una cuenta nueva pide nombre y apellido, queda en rol `CUSTOMER`, locale `es-VE`, y abre sesión. Una cuenta existente abre sesión y conserva el nombre. No se piden dirección ni cédula.

La sesión guarda el refresh token solo como SHA-256. El valor opaco sale de `crypto.randomBytes`. Cada refresh rota el token: el anterior queda con `rotatedAt` y `revokedAt`. Presentar un token ya rotado revoca la familia. Cerrar sesión pone `revokedAt` en esa sesión y deja viva al resto de la familia. El access token es un JWT HS256 de 15 minutos firmado con `jose`, con `sub`, `sid`, `role` y `mfa`. El secreto de firma en producción es `AUTH_TOKEN_SECRET` (32 caracteres o más) y no puede ser el marcador de desarrollo. El alta de una cuenta nueva usa un JWT de registro de 10 minutos, de un solo uso, guardado como `RegistrationGrant` sin el OTP.

Sin `DATABASE_URL`, desarrollo y pruebas usan `MemoryAuthRepository`. Producción exige Postgres y `PrismaAuthRepository`. El cliente de Prisma no se construye si falta la URL.

## Autorización

Roles sembrados en la migración `20261026190000_auth_session`: `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `PROCUREMENT_AGENT`, `FINANCE_AGENT`, `LOGISTICS_AGENT`, `SUPPORT_AGENT`, `CUSTOMER`. La tabla `Permission` sigue vacía.

`GET /v1/admin/access` exige access token vigente y `mfaSatisfied`. El ingreso por OTP deja ese flag en falso, también si el rol no es `CUSTOMER`. Sin token o con sesión revocada responde `unauthorized`. Con sesión de cliente, o con rol interno sin MFA, responde `forbidden`. No hay panel ni recursos de pedido.

Cada lectura futura de pedido, cotización, comprobante o dirección tiene que filtrar por el usuario autenticado o por un permiso explícito. Un id adivinado no debe entregar el recurso de otra persona.

## Dinero

Los montos de producto son centavos enteros. Postgres los guarda en `BigInt`. El JSON usa enteros dentro de `Number.MAX_SAFE_INTEGER`. Las tasas, si se guardan, usan `Decimal`. Está prohibido usar `float` para dinero. Zod rechaza `10.5` y rechaza strings en el monto.

La idempotencia del pago es una columna única. No se guarda PAN, CVV ni el dato crudo de banda. Un proveedor tokeniza. El webhook se acepta solo con firma válida y se procesa una vez.

Una IA, si más adelante ayuda a redactar, no confirma pagos, no cambia precios y no mueve estados de dinero. Esas acciones quedan en código determinista y en personas con permiso.

## Auditoría y operación

`AuditLog` guarda actor, acción, entidad y metadata. Este corte no escribe ahí el ingreso. No se mete un OTP, un token ni un PAN. Los secretos van en el entorno del proveedor, nunca en git. `.env` está ignorado. `.env.example` no trae un `AUTH_TOKEN_SECRET` usable. Prisma no está en modo log de queries.

En producción, `parseAppEnv` falla si falta `DATABASE_URL`, si `AUTH_TOKEN_SECRET` no alcanza 32 caracteres, si es el marcador de desarrollo, o si `OTP_PROVIDER=simulated`. OpenAPI se monta solo fuera de producción. El endpoint manual del OTP aparece en ese documento solo cuando el proveedor simulado está montado.

## API y móvil

El ingreso valida el cuerpo con Zod y responde `invalid_request` sin repetir el cuerpo. El sitio guarda la sesión en `sessionStorage` de la pestaña y el identificador de dispositivo en `localStorage`. La pantalla móvil guarda la sesión en memoria del proceso, no en un almacén compartido. No hay binario firmado y TLS se deja al entorno donde corra el cliente.

## Qué no está hecho

No hay cifrado de aplicación propio: la firma es `jose` y el refresh es un aleatorio de Node con hash SHA-256. No hay WAF, no hay prueba de penetración y no hay gestión de llaves. No hay proveedor real de correo o SMS. El límite de tasa no cruza procesos. Esas piezas se eligen cuando haya datos y pagos reales.
