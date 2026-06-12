#!/usr/bin/env bash

set -e

# Ensure volume-mounted directories are owned by the app user.
# Railway (and some other runtimes) mount volumes as root:root without
# respecting the image-level chown, so we must fix ownership here while
# we still run as root before dropping privileges.
for dir in /app/data /app/artifacts /app/artifacts/output /app/artifacts/uploads /app/artifacts/logs /app/artifacts/test-results; do
  mkdir -p "$dir"
  chown appuser:appgroup "$dir"
done

REQUIRED_VARS=(
    "RESEND_API_KEY"
    "RESEND_FROM_EMAIL"
    "RESEND_ADMIN_EMAIL"
    "YOUTUBE_API_KEY"
    "OPENAI_API_KEY"
    "ANTHROPIC_API_KEY"
    "GEMINI_API_KEY"
    "GROQ_API_KEY"
    "DEEPINFRA_API_KEY"
    "GLADIA_API_KEY"
    "HAPPYSCRIBE_API_KEY"
    "HAPPYSCRIBE_ORGANIZATION_ID"
    "ELEVENLABS_API_KEY"
    "LLAMAPARSE_API_KEY"
    "MISTRAL_API_KEY"
    "BUCKET"
    "ACCESS_KEY_ID"
    "SECRET_ACCESS_KEY"
    "REGION"
    "ENDPOINT"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

echo "=== RUNTIME DIAGNOSTICS ==="
echo "  Bun version: $(bun --version)"
echo "  HOST=${HOST:-<unset>}"
echo "  PORT=${PORT:-<unset>}"
echo "  NODE_ENV=${NODE_ENV:-<unset>}"
echo "  ORIGIN=${ORIGIN:-<unset>}"
echo "  Working directory: $(pwd)"
echo "  Server entry: $(ls -la .output/server/index.mjs 2>&1)"
echo "=== END RUNTIME DIAGNOSTICS ==="

exec su-exec appuser bun run start
