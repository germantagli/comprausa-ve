# Avance

## En este corte

- El cliente no paga una cotización `PENDING_VALIDATION`. Un operador `FINANCE_AGENT`, `OPERATIONS_ADMIN` o `SUPER_ADMIN` escribe el importe final en centavos y publica la instantánea. El cliente acepta esa cotización. No hay tarifa automática.
- Stripe usa el SDK oficial y un Payment Intent solo si el entorno tiene una clave `sk_test_`. Sin clave, la opción dice que no está configurada. Las claves vivas se rechazan. CI no llama a Stripe: las pruebas usan un cliente falso, firma de webhook e idempotencia. No se guarda PAN.
- PayPal es un puerto sin captura.
- Zelle y Pago Móvil muestran instrucciones solo si están en el entorno. Pago Móvil registra banco, teléfono, referencia e importe. Una referencia repetida se rechaza.
- Subir un comprobante deja el pago en `PROOF_SUBMITTED` y el pedido en `PAYMENT_UNDER_REVIEW`. No pasa solo a `VERIFIED` ni a `PAID`. El operador verifica o rechaza con motivo. `VERIFIED` pasa el pago a `VERIFIED` y el pedido a `PAID`. `PAID` no compra en la tienda.
- El cliente no cambia esos estados ni ve el pago de otra persona. Cada cambio queda en auditoría. El archivo se limita por tipo y tamaño y no se ejecuta. En desarrollo se guarda en disco local; el puerto S3 no tiene credenciales.
- Las rutas de operador exigen MFA. El TOTP, con `otpauth`, va después del OTP. Sin MFA la revisión responde 403. En pruebas, el claim de MFA sale de la sesión que arma el test.
- Web y Expo: aceptar, elegir método, enviar comprobante y ver «en revisión». Pantalla mínima para publicar el importe y verificar o rechazar.

Sin Postgres, la cotización y el pago siguen en la memoria del proceso.

## Siguiente incremento

1. Persistencia de cotización, pago y TOTP cuando haya Postgres en el entorno de ejecución.
2. Transiciones manuales de logística, sin fechas prometidas. El resto del panel sigue sin construirse.
3. Captura real de Stripe o PayPal solo si una entidad elegible confirma el medio. Hasta entonces la clave de prueba no se versiona.
4. Proveedor real de OTP y límite de tasa compartido entre instancias.

No desplegar en ese incremento salvo que se pida aparte.
