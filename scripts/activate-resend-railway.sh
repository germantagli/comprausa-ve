#!/usr/bin/env bash
# Activa OTP por email (Resend) en el servicio API de Railway.
# Uso:
#   export RAILWAY_API_TOKEN=...
#   export RESEND_API_KEY=re_...
#   export OTP_EMAIL_FROM='TraeLo <onboarding@resend.dev>'   # opcional
#   ./scripts/activate-resend-railway.sh
set -euo pipefail

if [[ -z "${RAILWAY_API_TOKEN:-}${RAILWAY_TOKEN:-}" ]]; then
  echo "Falta RAILWAY_API_TOKEN (o RAILWAY_TOKEN). Crea uno en https://railway.com/account/tokens" >&2
  exit 1
fi
if [[ -z "${RESEND_API_KEY:-}" ]]; then
  echo "Falta RESEND_API_KEY" >&2
  exit 1
fi

FROM="${OTP_EMAIL_FROM:-TraeLo <onboarding@resend.dev>}"
SERVICE="${RAILWAY_API_SERVICE:-comprausa-api}"
WEB_ORIGIN="${WEB_ORIGIN:-https://comprausaweb-production.up.railway.app}"

command -v railway >/dev/null || {
  echo "Instala el CLI: curl -fsSL https://railway.com/install.sh | sh" >&2
  exit 1
}

echo "Setting variables on service: $SERVICE"
railway variable set \
  "OTP_PROVIDER=resend" \
  "RESEND_API_KEY=${RESEND_API_KEY}" \
  "OTP_EMAIL_FROM=${FROM}" \
  "WEB_ORIGIN=${WEB_ORIGIN}" \
  --service "$SERVICE"

echo "Redeploying…"
railway redeploy --service "$SERVICE" --yes

echo "Done. Check: curl -sS https://comprausaapi-production.up.railway.app/health"
