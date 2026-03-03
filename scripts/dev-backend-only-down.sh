#!/bin/bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/dev-backend-only-down.sh [options]

Stops/removes backend-only dev services without touching frontend containers.

Options:
  --remove   Remove stopped containers for the dev services
  --all      Run `docker compose down` (stops everything in this compose project)
  -h, --help Show this help
EOF
}

REMOVE=false
ALL=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --remove) REMOVE=true; shift ;;
    --all) ALL=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; echo ""; usage; exit 1 ;;
  esac
done

if $ALL; then
  docker compose down
  exit 0
fi

services=(backend migrate image-worker email-worker cleanup-worker minio minio-setup redis postgres)

echo "Stopping services (if running): ${services[*]}"
docker compose stop "${services[@]}" >/dev/null 2>&1 || true

if $REMOVE; then
  echo "Removing containers for: ${services[*]}"
  docker compose rm -f "${services[@]}" >/dev/null 2>&1 || true
fi

echo "Done."
