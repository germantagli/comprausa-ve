#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$root"
export DATABASE_URL="${DATABASE_URL:-postgresql://comprausa:comprausa@127.0.0.1:5432/comprausa}"
pnpm --filter @comprausa/api exec prisma validate
