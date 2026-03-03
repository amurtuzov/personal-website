#!/bin/bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/dev-backend-only.sh [options]

Starts the backend stack in Docker without any frontend services.

Options:
  --with-minio        Start MinIO for upload signing endpoints
  --with-image-worker Start image processing worker
  --with-worker       Alias for --with-image-worker
  --with-email-worker Start email sending worker
  --with-cleanup-worker Start S3 cleanup worker (delete objects after DB deletes)
  --build             Build images before starting
  --logs              Tail backend logs after starting
  -h, --help          Show this help
EOF
}

WITH_MINIO=false
WITH_IMAGE_WORKER=false
WITH_EMAIL_WORKER=false
WITH_CLEANUP_WORKER=false
DO_BUILD=false
TAIL_LOGS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-minio) WITH_MINIO=true; shift ;;
    --with-image-worker) WITH_IMAGE_WORKER=true; shift ;;
    --with-worker) WITH_IMAGE_WORKER=true; shift ;;
    --with-email-worker) WITH_EMAIL_WORKER=true; shift ;;
    --with-cleanup-worker) WITH_CLEANUP_WORKER=true; shift ;;
    --build) DO_BUILD=true; shift ;;
    --logs) TAIL_LOGS=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; echo ""; usage; exit 1 ;;
  esac
done

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker is not running."
  echo "Start Docker Desktop and try again."
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "No .env found. Creating one from .env.local.example..."
  cp .env.local.example .env
  echo "Created .env"
fi

services=(postgres redis migrate backend)
if $WITH_MINIO; then
  services+=(minio minio-setup)
fi
if $WITH_IMAGE_WORKER; then
  services+=(image-worker)
fi
if $WITH_EMAIL_WORKER; then
  services+=(email-worker)
fi
if $WITH_CLEANUP_WORKER; then
  services+=(cleanup-worker)
fi

echo "Starting services: ${services[*]}"
if $DO_BUILD; then
  docker compose up -d --build "${services[@]}"
else
  docker compose up -d "${services[@]}"
fi

echo ""
echo "Backend is available at:"
echo "  - http://localhost:4000/api/health"
if $WITH_MINIO; then
  echo "MinIO Console:"
  echo "  - http://localhost:9001 (minioadmin / minioadmin)"
fi
echo ""
echo "Useful commands:"
echo "  Logs (backend): docker compose logs -f backend"
echo "  Stop:          ./scripts/dev-backend-only-down.sh"
echo ""

if $TAIL_LOGS; then
  docker compose logs -f backend
fi
