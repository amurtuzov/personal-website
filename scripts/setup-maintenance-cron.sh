#!/usr/bin/env bash
set -euo pipefail

CRON_TZ_VALUE="${CRON_TZ_VALUE:-Asia/Tashkent}"
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-30 3 * * *}"
PRUNE_SCHEDULE="${PRUNE_SCHEDULE:-10 4 * * *}"
REPO_DIR="${REPO_DIR:-/opt/personal-website}"
ENV_FILE_PATH="${ENV_FILE_PATH:-.env}"
LOG_DIR="${LOG_DIR:-${REPO_DIR}/logs/maintenance}"
BLOCK_NAME="personal-website-maintenance"

BEGIN_MARKER="# BEGIN ${BLOCK_NAME}"
END_MARKER="# END ${BLOCK_NAME}"

mkdir -p "${LOG_DIR}"

existing_cron="$(crontab -l 2>/dev/null || true)"
cleaned_cron="$(printf '%s\n' "${existing_cron}" | awk -v begin="${BEGIN_MARKER}" -v end="${END_MARKER}" '
  $0 == begin { skip = 1; next }
  $0 == end { skip = 0; next }
  !skip { print }
')"

new_block="$(cat <<EOF
${BEGIN_MARKER}
CRON_TZ=${CRON_TZ_VALUE}
${BACKUP_SCHEDULE} cd ${REPO_DIR} && ENV_FILE=${ENV_FILE_PATH} ./scripts/cron-db-backup.sh >> ${LOG_DIR}/db-backup.log 2>&1
${PRUNE_SCHEDULE} cd ${REPO_DIR} && ENV_FILE=${ENV_FILE_PATH} ./scripts/cron-image-prune.sh >> ${LOG_DIR}/docker-image-prune.log 2>&1
${END_MARKER}
EOF
)"

{
  if [ -n "${cleaned_cron}" ]; then
    printf '%s\n' "${cleaned_cron}"
  fi
  printf '%s\n' "${new_block}"
} | crontab -

echo "Maintenance cron installed:"
echo "- Timezone: ${CRON_TZ_VALUE}"
echo "- Backup:   ${BACKUP_SCHEDULE}"
echo "- Prune:    ${PRUNE_SCHEDULE}"
echo "- Logs:     ${LOG_DIR}"
