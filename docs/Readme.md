## Tooling

This repo uses Yarn via Corepack (pinned in `package.json` via `packageManager`). If you have Yarn Classic installed globally, run `corepack enable` and use the Corepack-managed `yarn`.

## API Endpoints

### Public

- Auth: `POST /auth/register`, `POST /auth/login`
- Health: `GET /api/health`
- Contact: `POST /api/contact`
- Albums: `GET /api/albums`, `GET /api/albums/slug/:slug` (includes `coverPhoto`, does not include full `photos` list)
- Photos: `GET /api/photos`, `GET /api/photos/:id`, `GET /api/albums/:albumId/photos` (paginated)

### Protected (JWT)

- Albums: `GET /api/albums/admin/all`, `POST /api/albums`, `GET /api/albums/:id`, `PUT /api/albums/:id`, `DELETE /api/albums/:id`
- Photos: `POST /api/sign-upload`, `POST /api/sign-bulk-upload`, `POST /api/photos`, `POST /api/photos/bulk`, `PUT /api/photos/:id`, `DELETE /api/photos/:id`, `POST /api/photos/bulk-delete`, `POST /api/photos/:id/reprocess`, `GET /api/admin/photos`

## Database Schema Changes (Prisma Migrations)

Schema lives in `packages/database/prisma/schema.prisma`.

### Create a New Migration (Dev)

1. Update `packages/database/prisma/schema.prisma`.
2. Ensure you have a local `.env` (copy from `.env.local.example`) and `DATABASE_URL` points to your dev Postgres.
3. Create and apply a migration:

```bash
MIGRATION_NAME=add_some_field yarn database:migrate:create
```

This writes the migration under `packages/database/prisma/migrations/` and updates your dev database.

### Apply Existing Migrations (No New Migration)

If you pulled new migrations and just need to apply them:

```bash
yarn database:migrate:deploy
```

### Regenerate Prisma Client / Types

If TS types are out of sync (e.g. after pulling schema/migration changes):

```bash
yarn database:generate
yarn database:build
```

### Deploy Note

- Always commit the new migration folder changes.
- The Docker Compose `migrate` service runs migrations before `backend` starts.
- Don’t edit old migrations; create a new one.

## Contact Form Email (Queued)

The backend exposes a public contact form endpoint that **queues** email sending and returns immediately.

- **Endpoint:** `POST /api/contact`
- **Response:** HTTP `202` with `{ accepted: true, jobId }`
- **Delivery:** processed by a separate BullMQ worker (`email-worker`) using Nodemailer + Google SMTP

### Request Body

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "message": "Hello!",
  "subject": "Optional subject",
  "website": ""
}
```

Notes:
- `website` is a honeypot field for bots. Keep it empty in the real form.
- The backend applies throttling to reduce spam.

### Environment Variables

Set these in `.env` (see `.env.local.example` / `.env.production.example`):

- `SMTP_HOST` (default `smtp.gmail.com`)
- `SMTP_PORT` (default `465`)
- `SMTP_SECURE` (default `true`)
- `SMTP_USER` (Gmail/Workspace address)
- `SMTP_PASS` (Google **App Password**)
- `CONTACT_TO` (where contact messages are delivered)
- `CONTACT_FROM` (usually the same as `SMTP_USER` for Gmail)
- `CONTACT_SUBJECT_PREFIX` (optional, default `[Contact Form]`)

### Running Locally (Docker Compose)

1. Fill in the SMTP/contact env vars in your `.env` (or start from `.env.local.example`).
2. Start services:

```bash
docker compose up -d redis backend email-worker
```

3. Send a test message:

```bash
curl -i -X POST http://localhost:4000/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"test@example.com","message":"Hello from curl!"}'
```

### Google SMTP (Recommended Setup)

Use an **App Password** (requires 2‑Step Verification):
- Google Account → Security → 2‑Step Verification → App passwords
- Create an app password and use it as `SMTP_PASS`

For Gmail, `CONTACT_FROM` should usually match `SMTP_USER` to avoid rejected mail.

### Troubleshooting

- If emails are not delivered, check `email-worker` logs: `docker compose logs -f email-worker`
- If jobs are queued but not processed, confirm Redis is healthy and both `REDIS_URL` + `REDIS_PASSWORD` are consistent across backend and workers.
- If storage is not cleaned up after deleting photos/albums, check `cleanup-worker` logs: `docker compose logs -f cleanup-worker`

## Telegram Ops Bot (Optional)

You can run a Telegram bot that can check Docker Compose status/logs and perform controlled restart/recreate operations.

Safety model:
- Restricted by `TELEGRAM_ALLOWED_USER_IDS` (required)
- Optional additional chat restriction: `TELEGRAM_ALLOWED_CHAT_IDS`
- Service-level allowlist via `OPS_BOT_ALLOWED_SERVICES`
- No arbitrary shell commands

Commands:
- `/status`
- `/monitor` (host CPU/RAM/swap/disk/uptime)
- `/services`
- `/logs <service> [lines]`
- `/restart <service1[,service2]|all>`
- `/recreate <service1[,service2]|all>`

Run locally (host process):

```bash
yarn ops-bot:build
yarn ops-bot:start
```

Run in Docker Compose (optional):

```bash
docker compose up -d ops-bot
```

## Local Dev: Backend in Docker, Frontend on Host

If you want to develop the frontends locally (hot reload) while keeping the backend + dependencies in Docker, use the helper scripts:

- Start backend + Postgres + Redis (+ migrations): `./scripts/dev-backend-only.sh`
- Add MinIO (for upload signing): `./scripts/dev-backend-only.sh --with-minio`
- If the frontend runs on your host, set `S3_PRESIGN_ENDPOINT=http://localhost:9000` so presigned URLs are host-reachable
- Add workers (image processing + email): `./scripts/dev-backend-only.sh --with-image-worker --with-email-worker`
- Add cleanup worker (S3 deletions): `./scripts/dev-backend-only.sh --with-cleanup-worker`
- Stop backend-only stack: `./scripts/dev-backend-only-down.sh`

Backend is exposed at `http://localhost:4000` (health check: `http://localhost:4000/api/health`).

### Docker Compose Override (Local)

Local MinIO setup lives in `docker-compose.override.yml` (see `.env.local.example` which defaults to `S3_ENDPOINT=http://minio:9000`).

- If you run plain `docker compose ...` the override file is auto-merged.
- If you run with explicit files (e.g. `docker compose -f docker-compose.yml ...`), you must also include the override to use MinIO: `docker compose -f docker-compose.yml -f docker-compose.override.yml ...`.
- If you need machine-specific tweaks, create `docker-compose.override.local.yml` (ignored by git) and add it with `-f`.

## Scripts

All scripts in `./scripts/` are meant to be run from the repo root.

- `./scripts/dev-backend-only.sh` — Start backend stack in Docker (no frontends). Supports `--with-minio`, `--with-image-worker`, `--with-email-worker`, `--with-cleanup-worker`, `--build`, `--logs`.
- `./scripts/dev-backend-only-down.sh` — Stop backend-only dev services. Use `--remove` to remove stopped containers or `--all` for `docker compose down`.
- `./scripts/create-migration.sh` — Create + apply a new Prisma migration in dev via Docker Compose. Typically run as `MIGRATION_NAME=some_change yarn database:migrate:create`.
- `./scripts/check-env.sh [ENV_FILE]` — Validate required env vars before deploy (defaults to `.env`), including placeholder checks for production-safety.
- `./scripts/deploy-registry.sh [service ...]` — Production deploy wrapper for CI/CD images (`check-env` → `pull` → `up -d`) using `docker-compose.yml + docker-compose.prod.yml` and `IMAGE_TAG`. If services are provided, only those are pulled/recreated.
- `./scripts/set-cms-password.sh [ENV_FILE] [PLAIN_PASSWORD]` — Generate Caddy bcrypt hash and update `CMS_BASIC_PASS` in env file (stored in Docker Compose-safe escaped format: `$$2b$$...`). If `PLAIN_PASSWORD` is omitted, it uses `CMS_BASIC_PASS_PLAIN`; if missing, it prompts interactively.
- `./scripts/generate-secrets.js` — Print random values for `.env` (`POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`). Run `node scripts/generate-secrets.js`.
- `./scripts/print-env-keys.sh` — Print sorted env var keys present in `.env` (ignores comments/blank lines).
- `./scripts/logs.sh` — Wrapper for `docker compose logs -f` (pass services like `./scripts/logs.sh backend`).
- `./scripts/restart.sh` — Wrapper for `docker compose restart` (pass services like `./scripts/restart.sh backend`).
- `./scripts/stop.sh` — Stop the whole Docker Compose stack (`docker compose down`).
- `./scripts/clean.sh` — Destructive cleanup (`docker compose down -v`) after confirmation (removes volumes/data).
- `yarn ops-bot:build` / `yarn ops-bot:start` — Build and run the Telegram ops bot (`services/ops-bot`).
