# Ops Bot

Telegram bot for safe operational actions over Docker Compose.

## Required env

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_USER_IDS` (comma-separated numeric IDs)

## Optional env

- `TELEGRAM_ALLOWED_CHAT_IDS`
- `OPS_BOT_ALLOWED_SERVICES`
- `OPS_BOT_WORKDIR` (default: current working dir)
- `OPS_BOT_COMPOSE_FILES` (comma-separated; if unset, auto-detects `docker-compose.yml` and adds `docker-compose.override.yml` when present)
- `OPS_BOT_ENV_FILE`
- `OPS_BOT_PROJECT_NAME`
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
