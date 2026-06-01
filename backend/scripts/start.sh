#!/bin/sh
echo "=== ENV CHECK ==="
echo "DATABASE_URL present: ${DATABASE_URL:+YES}${DATABASE_URL:-NO (missing!)}"
echo "NODE_ENV: ${NODE_ENV:-unset}"
echo "================="

set +e
prisma migrate resolve --rolled-back 20260502170000_add_argentina_to_country
prisma migrate resolve --rolled-back 20260601090000_owner_subscriptions
set -e
prisma migrate deploy
node dist/index.js
