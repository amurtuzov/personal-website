#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/db-restore.sh [options]

Restores a PostgreSQL custom dump into Docker Compose postgres.

Safe default:
  - restores into a separate database (e.g. photosdb_restore)
  - does NOT overwrite live database

Options:
  --env-file <path>       Env file for docker compose (default: .env or ENV_FILE)
  --dump <path>           Dump file path (default: <DB_BACKUP_LOCAL_DIR>/latest.dump)
  --target-db <name>      Restore target DB (default: <live_db>_restore)
  --to-live               Restore into live DB from DATABASE_URL (dangerous)
  --yes-live              Required with --to-live to confirm intent
  --help                  Show this help
EOF
}

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILES_RAW="${COMPOSE_FILES:-docker-compose.yml,docker-compose.prod.yml}"
DUMP_PATH=""
TARGET_DB=""
TO_LIVE="false"
YES_LIVE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --dump)
      DUMP_PATH="$2"
      shift 2
      ;;
    --target-db)
      TARGET_DB="$2"
      shift 2
      ;;
    --to-live)
      TO_LIVE="true"
      shift
      ;;
    --yes-live)
      YES_LIVE="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [ ! -f "${ENV_FILE}" ]; then
  echo "ERROR: ${ENV_FILE} not found."
  exit 1
fi

read_env_value() {
  key="$1"
  awk -v key="${key}" '
    /^[[:space:]]*#/ { next }
    /^[[:space:]]*$/ { next }
    {
      line = $0
      sub(/^[[:space:]]*/, "", line)
      if (line ~ ("^" key "=")) {
        value = substr(line, length(key) + 2)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
        if (value ~ /^".*"$/ || value ~ /^'\''.*'\''$/) {
          value = substr(value, 2, length(value) - 2)
        }
        print value
        found = 1
        exit
      }
    }
    END {
      if (!found) exit 1
    }
  ' "${ENV_FILE}"
}

get_config_value() {
  key="$1"
  fallback="${2:-}"
  value="${!key:-}"
  if [ -n "${value}" ]; then
    printf '%s' "${value}"
    return
  fi

  if value="$(read_env_value "${key}" 2>/dev/null)"; then
    printf '%s' "${value}"
    return
  fi

  printf '%s' "${fallback}"
}

trim_value() {
  value="$1"
  printf '%s' "${value}" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//'
}

extract_db_name_from_url() {
  raw_url="$1"
  no_query="${raw_url%%\?*}"
  db_name="${no_query##*/}"
  printf '%s' "${db_name}"
}

extract_db_user_from_url() {
  raw_url="$1"
  without_scheme="${raw_url#*://}"
  userinfo="${without_scheme%%@*}"
  if [ "${userinfo}" = "${without_scheme}" ]; then
    printf ''
    return
  fi

  printf '%s' "${userinfo%%:*}"
}

validate_db_name() {
  value="$1"
  if [[ ! "${value}" =~ ^[a-zA-Z0-9_]+$ ]]; then
    echo "ERROR: invalid database name '${value}'. Allowed pattern: [a-zA-Z0-9_]+"
    exit 1
  fi
}

compose_base=(docker compose)
IFS=',' read -r -a compose_files <<< "${COMPOSE_FILES_RAW}"
for compose_file in "${compose_files[@]}"; do
  compose_file="$(trim_value "${compose_file}")"
  if [ -z "${compose_file}" ]; then
    continue
  fi
  compose_base+=(-f "${compose_file}")
done
compose_base+=(--env-file "${ENV_FILE}")

DATABASE_URL="$(get_config_value DATABASE_URL "")"
if [ -z "${DATABASE_URL}" ]; then
  echo "ERROR: DATABASE_URL is missing in ${ENV_FILE}."
  exit 1
fi

live_db="$(extract_db_name_from_url "${DATABASE_URL}")"
db_user_from_url="$(extract_db_user_from_url "${DATABASE_URL}")"
PGUSER="$(get_config_value DB_BACKUP_POSTGRES_USER "${db_user_from_url:-postgres}")"
LOCAL_DIR="$(get_config_value DB_BACKUP_LOCAL_DIR "/opt/personal-website/backups/db")"

if [ -z "${DUMP_PATH}" ]; then
  DUMP_PATH="${LOCAL_DIR}/latest.dump"
fi

if [ ! -f "${DUMP_PATH}" ]; then
  echo "ERROR: dump file not found: ${DUMP_PATH}"
  exit 1
fi

if [ "${TO_LIVE}" = "true" ]; then
  if [ "${YES_LIVE}" != "true" ]; then
    echo "ERROR: --to-live requires --yes-live confirmation."
    exit 1
  fi
  TARGET_DB="${live_db}"
else
  if [ -z "${TARGET_DB}" ]; then
    TARGET_DB="${live_db}_restore"
  fi
fi

validate_db_name "${TARGET_DB}"

echo "Validating dump file..."
"${compose_base[@]}" exec -T postgres pg_restore --list - < "${DUMP_PATH}" >/dev/null

if [ "${TO_LIVE}" = "true" ]; then
  echo "WARNING: restoring into LIVE database '${TARGET_DB}'."
  echo "This operation will terminate active connections and replace database objects."
fi

echo "Preparing target database '${TARGET_DB}'..."
"${compose_base[@]}" exec -T postgres psql -U "${PGUSER}" -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${TARGET_DB}' AND pid <> pg_backend_pid();" >/dev/null
"${compose_base[@]}" exec -T postgres psql -U "${PGUSER}" -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"${TARGET_DB}\";" >/dev/null
"${compose_base[@]}" exec -T postgres psql -U "${PGUSER}" -d postgres -v ON_ERROR_STOP=1 \
  -c "CREATE DATABASE \"${TARGET_DB}\";" >/dev/null

echo "Restoring dump into '${TARGET_DB}'..."
"${compose_base[@]}" exec -T postgres pg_restore \
  -U "${PGUSER}" \
  -d "${TARGET_DB}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  - < "${DUMP_PATH}"

echo "Restore completed successfully."
echo "Target database: ${TARGET_DB}"
if [ "${TO_LIVE}" != "true" ]; then
  echo "Safe mode used: live database was not touched."
fi
