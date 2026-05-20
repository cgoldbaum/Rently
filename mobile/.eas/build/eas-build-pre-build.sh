#!/bin/bash
set -euo pipefail

if [ -n "${GOOGLE_SERVICES_JSON_B64:-}" ]; then
  echo "$GOOGLE_SERVICES_JSON_B64" | base64 -d > android/app/google-services.json
  echo "[hook] google-services.json written to android/app/ from secret"
fi
