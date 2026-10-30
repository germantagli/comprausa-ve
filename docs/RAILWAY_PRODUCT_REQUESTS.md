# Activar solicitudes/cotizaciones en Railway

Procedimiento seguro. **No ejecutar en producción sin autorización explícita del responsable.**

## Diagnóstico del 404 (histórico)

1. Antes del merge de PR #35, la API de producción respondía `404` en `/v1/product-requests*` porque esas rutas no existían en el commit desplegado.
2. Tras merge a `main` (`440e069`), GitHub registró despliegues Railway a `440e069`. La URL pública pasó a responder `401 unauthorized` (ruta montada + guard), no `404`.
3. Los estados GitHub Deployment para esos deploys aparecen como `failure` en al menos un entorno Railway. Hace falta revisar el log de **preDeploy** (`prisma migrate deploy`) en el dashboard Railway: si la migración no corrió, las rutas existen pero las tablas pueden faltar (errores 500 al usar el módulo).

## Precondiciones

- Servicio API con `DATABASE_URL` (Postgres Railway).
- `NODE_ENV=production`.
- `AUTH_TOKEN_SECRET` ≥ 32 caracteres (no el marcador de desarrollo).
- Commit que incluye `apps/api/src/product-requests` y la migración `20261030220000_product_requests`.

## Validación local (ya hecha en este corte)

```bash
# Postgres local (docker-compose o cluster local)
export DATABASE_URL=postgresql://comprausa:comprausa@127.0.0.1:5432/comprausa
cd apps/api
pnpm exec prisma validate
pnpm exec prisma migrate deploy   # aplica 20261030220000_product_requests de forma aditiva
```

La migración crea enums/tablas nuevas y añade `Order.productQuoteId`. **No borra tablas existentes.**

## Procedimiento de producción (requiere autorización)

1. Abrir el log del último deploy fallido/exitoso en Railway y confirmar si `prisma migrate deploy` aplicó `20261030220000_product_requests`.
2. Si las tablas no existen, con autorización:
   - Opción A: redesplegar el servicio API (preDeploy vuelve a ejecutar `migrate deploy`).
   - Opción B: `railway run --service comprausa-api pnpm --filter @comprausa/api exec prisma migrate deploy` (o equivalente en el panel).
3. Verificar:
   - `GET /health` → `persistence: "postgres"`, `productRequests: "prisma"`.
   - `GET /health/ready` → `200 ready`.
   - `POST /v1/product-requests` sin token → `401` (no `404`).
4. Smoke autenticado (cuenta de prueba, no datos reales de clientes): crear solicitud → listar admin → cotizar → aceptar.
5. No conectar el portátil de desarrollo a Postgres de producción para cargas de prueba sin autorización.

## Memoria local

Sin `DATABASE_URL`, desarrollo exige `ALLOW_IN_MEMORY_PERSISTENCE=true`. Producción lo rechaza. La UI muestra un banner cuando `/health` reporta `persistence: "memory"`.
