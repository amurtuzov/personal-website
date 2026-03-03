#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-${ENV_FILE:-.env}}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "ERROR: ${ENV_FILE} not found."
  exit 1
fi

required_keys=(
  NODE_ENV
  PORT
  DATABASE_URL
  POSTGRES_PASSWORD
  REDIS_URL
  REDIS_PASSWORD
  JWT_SECRET
  S3_ENDPOINT
  S3_REGION
  S3_BUCKET
  S3_ACCESS_KEY_ID
  S3_SECRET_ACCESS_KEY
  VITE_API_URL
  NUXT_PUBLIC_API_URL
  CMS_BASIC_USER
  CMS_BASIC_PASS
  SMTP_HOST
  SMTP_PORT
  SMTP_SECURE
  SMTP_USER
  SMTP_PASS
  CONTACT_TO
  CONTACT_FROM
  CONTACT_SUBJECT_PREFIX
)

missing_keys=()
empty_keys=()
errors=()
warnings=()

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

get_env_or_empty() {
  key="$1"
  if value="$(read_env_value "${key}" 2>/dev/null)"; then
    printf '%s' "${value}"
  else
    printf ''
  fi
}

for key in "${required_keys[@]}"; do
  if ! value="$(read_env_value "${key}" 2>/dev/null)"; then
    missing_keys+=("${key}")
    continue
  fi
  if [ -z "${value}" ]; then
    empty_keys+=("${key}")
  fi
done

node_env="$(get_env_or_empty NODE_ENV)"
jwt_secret="$(get_env_or_empty JWT_SECRET)"
cms_user="$(get_env_or_empty CMS_BASIC_USER)"
cms_pass="$(get_env_or_empty CMS_BASIC_PASS)"
nuxt_api_url="$(get_env_or_empty NUXT_PUBLIC_API_URL)"
vite_api_url="$(get_env_or_empty VITE_API_URL)"
database_url="$(get_env_or_empty DATABASE_URL)"
smtp_pass="$(get_env_or_empty SMTP_PASS)"
redis_password="$(get_env_or_empty REDIS_PASSWORD)"
contact_to="$(get_env_or_empty CONTACT_TO)"
contact_from="$(get_env_or_empty CONTACT_FROM)"
smtp_user="$(get_env_or_empty SMTP_USER)"

if [ "${node_env}" != "production" ]; then
  warnings+=("NODE_ENV is '${node_env:-unset}' (production expected for deploy).")
fi

jwt_len="$(printf %s "${jwt_secret}" | wc -c | tr -d ' ')"
if [ "${jwt_len}" -lt 32 ]; then
  errors+=("JWT_SECRET is too short (${jwt_len} chars). Use at least 32 chars.")
fi

if [ "${cms_user}" = "cmsuser" ] || [[ "${cms_user}" == your_* ]]; then
  errors+=("CMS_BASIC_USER is still a placeholder value.")
fi

if [ "${cms_pass}" = "changeme" ] || [[ "${cms_pass}" == your_* ]]; then
  errors+=("CMS_BASIC_PASS is still a placeholder value.")
fi

cms_len="$(printf %s "${cms_pass}" | wc -c | tr -d ' ')"
if [ "${cms_len}" -lt 12 ]; then
  errors+=("CMS_BASIC_PASS should be at least 12 characters.")
fi

if [[ "${nuxt_api_url}" == *"localhost"* ]]; then
  errors+=("NUXT_PUBLIC_API_URL points to localhost.")
fi

if [[ "${vite_api_url}" == *"localhost"* ]]; then
  errors+=("VITE_API_URL points to localhost.")
fi

if [[ "${nuxt_api_url}" == *"yourdomain.com"* ]]; then
  errors+=("NUXT_PUBLIC_API_URL still contains the placeholder domain (yourdomain.com).")
fi

if [[ "${vite_api_url}" == *"yourdomain.com"* ]]; then
  errors+=("VITE_API_URL still contains the placeholder domain (yourdomain.com).")
fi

if [[ "${database_url}" == *"localhost"* ]]; then
  warnings+=("DATABASE_URL points to localhost.")
fi

if [ "${redis_password}" = "your_redis_password" ] || [[ "${redis_password}" == your_* ]]; then
  errors+=("REDIS_PASSWORD is still the placeholder value.")
fi

redis_len="$(printf %s "${redis_password}" | wc -c | tr -d ' ')"
if [ "${redis_len}" -lt 12 ]; then
  errors+=("REDIS_PASSWORD should be at least 12 characters.")
fi

if [ "${smtp_pass}" = "your_app_password" ] || [[ "${smtp_pass}" == your_* ]]; then
  errors+=("SMTP_PASS is still the placeholder value.")
fi

if [[ "${contact_to}" == *"yourdomain.com"* ]]; then
  errors+=("CONTACT_TO still contains the placeholder domain (yourdomain.com).")
fi

if [ -n "${contact_from}" ] && [ -n "${smtp_user}" ] && [ "${contact_from}" != "${smtp_user}" ]; then
  warnings+=("CONTACT_FROM differs from SMTP_USER. Some providers may reject mail.")
fi

if [ "${#missing_keys[@]}" -gt 0 ]; then
  echo "ERROR: Missing required keys in ${ENV_FILE}:"
  printf ' - %s\n' "${missing_keys[@]}"
fi

if [ "${#empty_keys[@]}" -gt 0 ]; then
  echo "ERROR: Empty required values in ${ENV_FILE}:"
  printf ' - %s\n' "${empty_keys[@]}"
fi

if [ "${#errors[@]}" -gt 0 ]; then
  echo "ERROR: Configuration errors:"
  printf ' - %s\n' "${errors[@]}"
fi

if [ "${#warnings[@]}" -gt 0 ]; then
  echo "WARN: Configuration warnings:"
  printf ' - %s\n' "${warnings[@]}"
fi

if [ "${#missing_keys[@]}" -gt 0 ] || [ "${#empty_keys[@]}" -gt 0 ] || [ "${#errors[@]}" -gt 0 ]; then
  exit 1
fi

echo "OK: Env check passed for ${ENV_FILE}"
