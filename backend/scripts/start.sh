#!/bin/sh
echo "=== ENV CHECK ==="
echo "DATABASE_URL present: ${DATABASE_URL:+YES}${DATABASE_URL:-NO (missing!)}"
echo "NODE_ENV: ${NODE_ENV:-unset}"
echo "================="

set -e
prisma migrate deploy
node dist/index.js
