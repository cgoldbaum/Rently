#!/bin/sh
set +e
prisma migrate resolve --rolled-back 20260502170000_add_argentina_to_country
set -e
prisma migrate deploy
node dist/index.js
