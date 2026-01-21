#!/usr/bin/env bash

set -e

GRAY='\033[38;2;107;114;128m'
WHITE='\033[38;2;229;231;235m'
RESET='\033[0m'

log() {
    local ms=$(python3 -c "import time; print(f'{time.time() % 1:.3f}'[1:])")
    echo -e "${GRAY}[$(date '+%H:%M:%S')${ms}]${RESET} ${WHITE}$1${RESET}"
}

cleanup() {
    kill -TERM $APP_PID 2>/dev/null || true
    wait $APP_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGTERM SIGINT

log "Starting autoshow container"

mkdir -p /data

exec bun run start &
APP_PID=$!

log "Container initialized"

wait $APP_PID
