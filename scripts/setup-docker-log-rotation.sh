#!/usr/bin/env bash
set -euo pipefail

DAEMON_JSON_PATH="${DAEMON_JSON_PATH:-/etc/docker/daemon.json}"
MAX_SIZE="${DOCKER_LOG_MAX_SIZE:-10m}"
MAX_FILE="${DOCKER_LOG_MAX_FILE:-5}"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run as root (or with sudo)."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required. Install it first (e.g., apt-get install -y jq)."
  exit 1
fi

mkdir -p "$(dirname "${DAEMON_JSON_PATH}")"

if [ -f "${DAEMON_JSON_PATH}" ]; then
  backup_path="${DAEMON_JSON_PATH}.bak.$(date -u +%Y%m%dT%H%M%SZ)"
  cp "${DAEMON_JSON_PATH}" "${backup_path}"
  echo "Existing daemon config backed up: ${backup_path}"
  source_json="$(cat "${DAEMON_JSON_PATH}")"
else
  source_json='{}'
fi

tmp_path="$(mktemp)"
printf '%s' "${source_json}" | jq \
  --arg maxSize "${MAX_SIZE}" \
  --arg maxFile "${MAX_FILE}" \
  '
  .["log-driver"] = "json-file" |
  .["log-opts"] = (.["log-opts"] // {}) |
  .["log-opts"]["max-size"] = $maxSize |
  .["log-opts"]["max-file"] = $maxFile
  ' > "${tmp_path}"

mv "${tmp_path}" "${DAEMON_JSON_PATH}"
chmod 0644 "${DAEMON_JSON_PATH}"

echo "Updated ${DAEMON_JSON_PATH}:"
cat "${DAEMON_JSON_PATH}"

echo "Restarting Docker..."
systemctl restart docker

echo "Docker log rotation is configured."
