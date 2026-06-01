#!/bin/sh
echo "=== ENV CHECK ==="
echo "DATABASE_URL present: ${DATABASE_URL:+YES}${DATABASE_URL:-NO (missing!)}"
echo "NODE_ENV: ${NODE_ENV:-unset}"
echo "================="

set +e
prisma migrate resolve --rolled-back 20260502170000_add_argentina_to_country
prisma migrate resolve --rolled-back 20260601090000_owner_subscriptions
# Limpia pagos duplicados antes del índice único, y destraba esa migración si quedó fallida.
prisma db execute --schema prisma/schema.prisma --file prisma/dedup-payments.sql
prisma migrate resolve --rolled-back 20260601090010_payment_unique_contract_period
set -e
prisma migrate deploy
node dist/index.js
