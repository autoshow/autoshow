#!/usr/bin/env bash

set -e

REQUIRED_VARS=(
    "YOUTUBE_API_KEY"
    "OPENAI_API_KEY"
    "ANTHROPIC_API_KEY"
    "GEMINI_API_KEY"
    "GROQ_API_KEY"
    "DEEPINFRA_API_KEY"
    "FAL_API_KEY"
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

exec bun run start
