#!/usr/bin/env bash
set -euo pipefail

LOCK_DIR="${LOCK_DIR:-/tmp/personal-website-image-prune.lock}"
PRUNE_UNTIL="${PRUNE_UNTIL:-168h}"
SKIP_MARKER="${SKIP_MARKER:-/opt/personal-website/.skip-image-prune}"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker command is not available."
  exit 1
fi

if [ -f "${SKIP_MARKER}" ]; then
  echo "Skip marker is present: ${SKIP_MARKER}"
  exit 0
fi

if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
  echo "Another prune process is already running. Skipping."
  exit 0
fi

cleanup() {
  rmdir "${LOCK_DIR}" 2>/dev/null || true
}
trap cleanup EXIT

if pgrep -f 'docker compose .* (up|pull|build|push)' >/dev/null 2>&1; then
  echo "Detected active docker compose deployment/build command. Skipping prune."
  exit 0
fi

echo "Docker disk usage before prune:"
docker system df

echo "Running: docker image prune -af --filter until=${PRUNE_UNTIL}"
docker image prune -af --filter "until=${PRUNE_UNTIL}"

echo "Docker disk usage after prune:"
docker system df

echo "Image prune completed successfully."
