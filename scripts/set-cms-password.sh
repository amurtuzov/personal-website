#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env}"
if [ "${1:-}" != "" ]; then
  ENV_FILE="$1"
fi

PLAIN_PASSWORD="${2:-}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "ERROR: ${ENV_FILE} not found."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required to generate bcrypt hash."
  exit 1
fi

read_env_value() {
  local key="$1"
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

if [ -z "${PLAIN_PASSWORD}" ]; then
  PLAIN_PASSWORD="$(read_env_value "CMS_BASIC_PASS_PLAIN" 2>/dev/null || true)"
fi

if [ -z "${PLAIN_PASSWORD}" ]; then
  read -r -s -p "Enter CMS password (will be stored in CMS_BASIC_PASS_PLAIN): " PLAIN_PASSWORD
  echo
fi

if [ -z "${PLAIN_PASSWORD}" ]; then
  echo "ERROR: Empty password is not allowed."
  exit 1
fi

HASHED_PASSWORD_RAW="$(
  node -e '
    let bcrypt;
    try {
      bcrypt = require("bcrypt");
    } catch {
      console.error("ERROR: missing `bcrypt` package. Run `corepack yarn install` in repo root.");
      process.exit(1);
    }
    const plain = process.argv[1];
    const cost = Number(process.env.BCRYPT_COST || "12");
    if (!plain) {
      console.error("ERROR: empty password");
      process.exit(1);
    }
    if (!Number.isFinite(cost) || cost < 4 || cost > 31) {
      console.error("ERROR: BCRYPT_COST must be between 4 and 31");
      process.exit(1);
    }
    console.log(bcrypt.hashSync(plain, cost));
  ' "${PLAIN_PASSWORD}" | tr -d '\r\n'
)"

if [ -z "${HASHED_PASSWORD_RAW}" ]; then
  echo "ERROR: Failed to generate bcrypt hash."
  exit 1
fi

# Docker Compose interprets '$' in .env values, so bcrypt hashes must be escaped as '$$'.
HASHED_PASSWORD_COMPOSE="${HASHED_PASSWORD_RAW//$/\$\$}"

TMP_FILE="$(mktemp)"
awk -v plain_password="${PLAIN_PASSWORD}" -v hashed_password="${HASHED_PASSWORD_COMPOSE}" '
  BEGIN { updated_hash=0; updated_plain=0 }
  /^CMS_BASIC_PASS_PLAIN=/ {
    print "CMS_BASIC_PASS_PLAIN=" plain_password
    updated_plain=1
    next
  }
  /^CMS_BASIC_PASS=/ {
    print "CMS_BASIC_PASS=" hashed_password
    updated_hash=1
    next
  }
  { print }
  END {
    if (!updated_plain) {
      print "CMS_BASIC_PASS_PLAIN=" plain_password
    }
    if (!updated_hash) {
      print "CMS_BASIC_PASS=" hashed_password
    }
  }
' "${ENV_FILE}" > "${TMP_FILE}"

mv "${TMP_FILE}" "${ENV_FILE}"
echo "Updated CMS_BASIC_PASS_PLAIN and CMS_BASIC_PASS in ${ENV_FILE}"
echo "CMS_BASIC_PASS stored in Docker Compose-safe format (\$\$2b\$\$...)."
