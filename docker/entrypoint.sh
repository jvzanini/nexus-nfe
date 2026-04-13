#!/bin/sh
set -e

echo "[entrypoint] Aplicando migrations..."
npx prisma migrate deploy 2>&1 || echo "[entrypoint] WARN: migrate falhou"

echo "[entrypoint] Rodando seed..."
node seed-prod.js 2>&1 || echo "[entrypoint] WARN: seed falhou"

echo "[entrypoint] Iniciando aplicacao..."
exec "$@"
