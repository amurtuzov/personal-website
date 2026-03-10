#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env}"
HOST_NAME="$(hostname)"
RUN_AT_UTC="$(date -u +'%Y-%m-%d %H:%M:%SZ')"

./scripts/docker-image-prune-safe.sh
ENV_FILE="${ENV_FILE}" ./scripts/notify-telegram.sh \
  --text "✅ Docker image prune completed on ${HOST_NAME} at ${RUN_AT_UTC}"
