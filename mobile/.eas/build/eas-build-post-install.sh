#!/bin/bash
set -euo pipefail

if [ -n "${GOOGLE_SERVICES_JSON_B64:-}" ]; then
  echo "$GOOGLE_SERVICES_JSON_B64" | base64 -d > google-services.json
  echo "[hook] google-services.json written from secret"
fi
