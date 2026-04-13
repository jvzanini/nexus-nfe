#!/bin/sh
set -e

echo "[entrypoint] Aplicando migrations..."
npx prisma migrate deploy 2>&1 || echo "[entrypoint] Migrations ja aplicadas ou falha (continuando)"

echo "[entrypoint] Rodando seed..."
npx prisma db seed 2>&1 || node prisma/seed.js 2>&1 || echo "[entrypoint] Seed falhou (continuando)"

echo "[entrypoint] Iniciando aplicacao..."
exec "$@"
