#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILES_RAW="${COMPOSE_FILES:-docker-compose.yml,docker-compose.prod.yml}"

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

sha256_file() {
  file_path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "${file_path}" | awk '{print $1}'
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "${file_path}" | awk '{print $1}'
    return
  fi

  echo "ERROR: neither sha256sum nor shasum is available."
  exit 1
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

LOCAL_DIR="$(get_config_value DB_BACKUP_LOCAL_DIR "/opt/personal-website/backups/db")"
PGUSER="$(get_config_value DB_BACKUP_POSTGRES_USER "postgres")"
PGDATABASE="$(get_config_value DB_BACKUP_POSTGRES_DB "photosdb")"
SPACES_ENABLED="$(get_config_value DB_BACKUP_SPACES_ENABLED "true")"
SPACES_BUCKET="$(get_config_value DB_BACKUP_SPACES_BUCKET "$(get_config_value S3_BUCKET "")")"
SPACES_REGION="$(get_config_value DB_BACKUP_SPACES_REGION "$(get_config_value S3_REGION "")")"
SPACES_ENDPOINT="$(get_config_value DB_BACKUP_SPACES_ENDPOINT "$(get_config_value S3_ENDPOINT "")")"
SPACES_PREFIX="$(get_config_value DB_BACKUP_SPACES_PREFIX "db-backups/postgres")"
SPACES_ACCESS_KEY_ID="$(get_config_value DB_BACKUP_SPACES_ACCESS_KEY_ID "$(get_config_value S3_ACCESS_KEY_ID "")")"
SPACES_SECRET_ACCESS_KEY="$(get_config_value DB_BACKUP_SPACES_SECRET_ACCESS_KEY "$(get_config_value S3_SECRET_ACCESS_KEY "")")"

mkdir -p "${LOCAL_DIR}"

latest_dump="${LOCAL_DIR}/latest.dump"
previous_dump="${LOCAL_DIR}/previous.dump"
latest_sha="${LOCAL_DIR}/latest.dump.sha256"
previous_sha="${LOCAL_DIR}/previous.dump.sha256"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
new_dump="${LOCAL_DIR}/.new-${timestamp}.dump"
new_sha="${LOCAL_DIR}/.new-${timestamp}.dump.sha256"

echo "Creating PostgreSQL dump (db=${PGDATABASE}, user=${PGUSER})..."
"${compose_base[@]}" exec -T postgres pg_dump -U "${PGUSER}" -d "${PGDATABASE}" -Fc --no-owner --no-privileges > "${new_dump}"

echo "Validating dump integrity..."
"${compose_base[@]}" exec -T postgres pg_restore --list < "${new_dump}" >/dev/null

checksum="$(sha256_file "${new_dump}")"
printf '%s  %s\n' "${checksum}" "latest.dump" > "${new_sha}"

if [ -f "${latest_dump}" ]; then
  mv -f "${latest_dump}" "${previous_dump}"
fi
if [ -f "${latest_sha}" ]; then
  mv -f "${latest_sha}" "${previous_sha}"
fi

mv -f "${new_dump}" "${latest_dump}"
mv -f "${new_sha}" "${latest_sha}"

echo "Local backup rotation complete:"
echo " - ${latest_dump}"
echo " - ${previous_dump} (if previous backup existed)"

spaces_enabled_normalized="$(printf '%s' "${SPACES_ENABLED}" | tr '[:upper:]' '[:lower:]')"
if [ "${spaces_enabled_normalized}" = "true" ] || [ "${spaces_enabled_normalized}" = "1" ] || [ "${spaces_enabled_normalized}" = "yes" ]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "ERROR: aws CLI is required for Spaces upload but is not installed."
    exit 1
  fi
  if [ -z "${SPACES_BUCKET}" ] || [ -z "${SPACES_REGION}" ] || [ -z "${SPACES_ENDPOINT}" ]; then
    echo "ERROR: Spaces backup is enabled but bucket/region/endpoint is missing."
    exit 1
  fi
  if [ -z "${SPACES_ACCESS_KEY_ID}" ] || [ -z "${SPACES_SECRET_ACCESS_KEY}" ]; then
    echo "ERROR: Spaces backup is enabled but access credentials are missing."
    exit 1
  fi

  export AWS_ACCESS_KEY_ID="${SPACES_ACCESS_KEY_ID}"
  export AWS_SECRET_ACCESS_KEY="${SPACES_SECRET_ACCESS_KEY}"
  export AWS_DEFAULT_REGION="${SPACES_REGION}"
  export AWS_EC2_METADATA_DISABLED="true"

  prefix="${SPACES_PREFIX%/}"
  remote_latest="s3://${SPACES_BUCKET}/${prefix}/latest.dump"
  remote_previous="s3://${SPACES_BUCKET}/${prefix}/previous.dump"
  remote_latest_sha="s3://${SPACES_BUCKET}/${prefix}/latest.dump.sha256"
  remote_previous_sha="s3://${SPACES_BUCKET}/${prefix}/previous.dump.sha256"

  aws_base=(aws --region "${SPACES_REGION}" --endpoint-url "${SPACES_ENDPOINT}")

  echo "Rotating remote backup in Spaces..."
  if "${aws_base[@]}" s3 ls "${remote_latest}" >/dev/null 2>&1; then
    "${aws_base[@]}" s3 cp "${remote_latest}" "${remote_previous}" --only-show-errors
  fi
  if "${aws_base[@]}" s3 ls "${remote_latest_sha}" >/dev/null 2>&1; then
    "${aws_base[@]}" s3 cp "${remote_latest_sha}" "${remote_previous_sha}" --only-show-errors
  fi

  echo "Uploading remote latest backup..."
  "${aws_base[@]}" s3 cp "${latest_dump}" "${remote_latest}" --only-show-errors
  "${aws_base[@]}" s3 cp "${latest_sha}" "${remote_latest_sha}" --only-show-errors

  echo "Spaces backup rotation complete:"
  echo " - ${remote_latest}"
  echo " - ${remote_previous} (if previous backup existed)"
fi

echo "Backup completed successfully at ${timestamp}"
