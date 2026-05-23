#!/bin/sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

set +e
npx prisma migrate resolve --rolled-back 20260502170000_add_argentina_to_country
set -e
npx prisma migrate deploy
node dist/index.js
