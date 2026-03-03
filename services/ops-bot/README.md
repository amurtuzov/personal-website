# Ops Bot

Telegram bot for safe operational actions over Docker Compose.

## Required env

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_USER_IDS` (comma-separated numeric IDs)

## Optional env

- `TELEGRAM_ALLOWED_CHAT_IDS`
- `OPS_BOT_ALLOWED_SERVICES` (default includes `backend,cleanup-worker,email-worker,image-worker,redis,postgres,minio,migrate,main,photos,cms,caddy,ops-bot`)
- `OPS_BOT_WORKDIR` (default: current working dir)
- `OPS_BOT_COMPOSE_FILES` (comma-separated; if unset, bot first tries Compose config files from its own container label, then falls back to `docker-compose.yml` + optional `docker-compose.override.yml`)
- `OPS_BOT_ENV_FILE`
- `OPS_BOT_PROJECT_NAME` (if unset, bot tries to detect Compose project name from its own container label)
- `OPS_BOT_DEFAULT_LOG_LINES` (default: `120`)
- `OPS_BOT_MAX_LOG_LINES` (default: `300`)
- `OPS_BOT_COMMAND_TIMEOUT_MS` (default: `60000`)

## Commands

- `/status`
- `/monitor` (host CPU/RAM/swap/disk/uptime)
- `/services`
- `/logs <service> [lines]`
- `/restart <service1[,service2]|all>`
- `/recreate <service1[,service2]|all>`
