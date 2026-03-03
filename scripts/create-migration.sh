#!/usr/bin/env bash
set -euo pipefail

if [ -z "${MIGRATION_NAME:-}" ]; then
  echo "Usage: MIGRATION_NAME=<name> yarn database:migrate:create"
  exit 1
fi

# Ensure env file exists for compose
if [ ! -f ".env" ]; then
  echo "No .env found. Creating one from .env.local.example..."
  cp .env.local.example .env
fi

# Track whether postgres was running so we can stop it only if we started it
POSTGRES_WAS_RUNNING=0
if docker compose ps --services --filter "status=running" | grep -q "^postgres$"; then
  POSTGRES_WAS_RUNNING=1
else
  echo "Starting postgres..."
  docker compose up -d postgres
fi

echo "Waiting for postgres to be ready..."
for i in {1..20}; do
  if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
  echo "Postgres is not ready. Aborting."
  exit 1
fi

echo "Creating and applying migration \"$MIGRATION_NAME\" via compose (reachable network, writing to host)..."
docker compose run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  migrate \
  yarn workspace @packages/database prisma migrate dev --name "$MIGRATION_NAME"

if [ "$POSTGRES_WAS_RUNNING" -eq 0 ]; then
  echo "Stopping and removing postgres (it was started by this script)..."
  docker compose rm -sf postgres
fi

echo "Done. Migration is under packages/database/prisma/migrations/"
