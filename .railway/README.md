# Railway (staging)

Definición de infraestructura en `railway.ts`. Railway ya no usa `railway.toml` para servicios nuevos; este archivo es el origen.

## Estado

El repositorio queda listo para vincularse. El proyecto en Railway no se crea hasta que alguien autentique el CLI y corra `railway config apply`.

## Primer vínculo

1. Instalar CLI: `curl -fsSL https://railway.com/install.sh | sh`
2. Autenticar: `railway login` (o exportar `RAILWAY_API_TOKEN`)
3. Autorizar GitHub en https://railway.com/account/github para `germantagli/comprausa-ve`
4. Crear o enlazar:
   - nuevo: `railway init --name comprausa-ve`
   - existente: `railway link`
5. `railway config plan` y luego `railway config apply --yes`
6. Dominio: `railway domain --service comprausa-api`
7. Secreto de sesión (≥ 32 caracteres, no el marcador de desarrollo):
   `railway variable set AUTH_TOKEN_SECRET="$(openssl rand -base64 48)" --service comprausa-api`
8. `railway redeploy --service comprausa-api`
9. Probar: `curl -sS "https://$DOMINIO/health"`

## Variables de la API en staging

| Variable | Origen |
| --- | --- |
| `NODE_ENV` | `production` (IaC) |
| `OTP_PROVIDER` | `none` (IaC; OTP simulado prohibido) |
| `DATABASE_URL` | referencia a Postgres (IaC) |
| `AUTH_TOKEN_SECRET` | se fija a mano / CLI (no vive en git) |
| `WEB_ORIGIN` | opcional; CORS del sitio cuando exista URL pública |
| `PORT` | lo inyecta Railway |

Redis y worker quedan fuera de este corte.
