#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/notify-telegram.sh --text "<message>" [--env-file .env]
EOF
}

ENV_FILE="${ENV_FILE:-.env}"
MESSAGE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --text)
      MESSAGE="$2"
      shift 2
      ;;
    -h|--help)
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

if [ -z "${MESSAGE}" ]; then
  echo "ERROR: --text is required."
  exit 1
fi

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

split_csv() {
  raw="$1"
  printf '%s\n' "${raw}" | tr ',' '\n' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//' | awk 'NF > 0'
}

BOT_TOKEN="$(read_env_value TELEGRAM_BOT_TOKEN 2>/dev/null || true)"
if [ -z "${BOT_TOKEN}" ]; then
  echo "ERROR: TELEGRAM_BOT_TOKEN is missing in ${ENV_FILE}."
  exit 1
fi

chat_ids_raw="$(read_env_value TELEGRAM_ALLOWED_CHAT_IDS 2>/dev/null || true)"
if [ -z "${chat_ids_raw}" ]; then
  chat_ids_raw="$(read_env_value TELEGRAM_ALLOWED_USER_IDS 2>/dev/null || true)"
fi

if [ -z "${chat_ids_raw}" ]; then
  echo "ERROR: TELEGRAM_ALLOWED_CHAT_IDS or TELEGRAM_ALLOWED_USER_IDS is required in ${ENV_FILE}."
  exit 1
fi

api_url="https://api.telegram.org/bot${BOT_TOKEN}/sendMessage"

while IFS= read -r chat_id; do
  curl --silent --show-error --fail \
    --request POST "${api_url}" \
    --data-urlencode "chat_id=${chat_id}" \
    --data-urlencode "text=${MESSAGE}" \
    --data-urlencode "disable_web_page_preview=true" \
    --output /dev/null
done < <(split_csv "${chat_ids_raw}")

echo "Telegram notification sent."
