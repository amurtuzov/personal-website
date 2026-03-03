#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Deploying from container registry..."

ENV_FILE="${ENV_FILE:-.env}"
IMAGE_TAG="${IMAGE_TAG:-main}"
IMAGE_REGISTRY="${IMAGE_REGISTRY:-ghcr.io}"
IMAGE_NAMESPACE="${IMAGE_NAMESPACE:-amurtuzov}"
TARGET_SERVICES=("$@")

if [ ! -f "${ENV_FILE}" ]; then
  echo "❌ Error: ${ENV_FILE} file not found!"
  echo "Provide a production env file (e.g., copy .env.production.example to ${ENV_FILE} and fill it)."
  exit 1
fi

COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.prod.yml)

echo "Using env file: ${ENV_FILE}"
echo "Compose files: ${COMPOSE_FILES[*]}"
echo "Image source: ${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/personal-website-*: ${IMAGE_TAG}"
if [ "${#TARGET_SERVICES[@]}" -gt 0 ]; then
  echo "Target services: ${TARGET_SERVICES[*]}"
else
  echo "Target services: all"
fi

./scripts/check-env.sh "${ENV_FILE}"

compose_base=(docker compose "${COMPOSE_FILES[@]}" --env-file "${ENV_FILE}")

if [ "${#TARGET_SERVICES[@]}" -gt 0 ]; then
  IMAGE_TAG="${IMAGE_TAG}" \
  IMAGE_REGISTRY="${IMAGE_REGISTRY}" \
  IMAGE_NAMESPACE="${IMAGE_NAMESPACE}" \
    "${compose_base[@]}" pull "${TARGET_SERVICES[@]}"

  IMAGE_TAG="${IMAGE_TAG}" \
  IMAGE_REGISTRY="${IMAGE_REGISTRY}" \
  IMAGE_NAMESPACE="${IMAGE_NAMESPACE}" \
    "${compose_base[@]}" up -d --no-build "${TARGET_SERVICES[@]}"
else
  IMAGE_TAG="${IMAGE_TAG}" \
  IMAGE_REGISTRY="${IMAGE_REGISTRY}" \
  IMAGE_NAMESPACE="${IMAGE_NAMESPACE}" \
    "${compose_base[@]}" pull

  IMAGE_TAG="${IMAGE_TAG}" \
  IMAGE_REGISTRY="${IMAGE_REGISTRY}" \
  IMAGE_NAMESPACE="${IMAGE_NAMESPACE}" \
    "${compose_base[@]}" up -d --no-build --remove-orphans
fi

echo "✅ Deployment complete!"
echo "Check status: docker compose ${COMPOSE_FILES[*]} --env-file ${ENV_FILE} ps"
echo "Check logs: docker compose ${COMPOSE_FILES[*]} --env-file ${ENV_FILE} logs -f"
