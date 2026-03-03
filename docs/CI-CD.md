# CI/CD (Build in GitHub Actions, Run on Droplet)

This repo is a Yarn-workspaces monorepo with multiple Docker images. The recommended approach for a small (2GB RAM / 1 vCPU) DigitalOcean Droplet is:

- Build and push images in GitHub Actions.
- Pull and run images on the Droplet (no `docker build` on the server).

That avoids common OOM failures during `yarn install` + TypeScript/Nest builds.

## Implemented in this repo

The repository now includes:

- `.github/workflows/build-and-deploy.yml` — builds/pushes all images to GHCR on `main`, then deploys over SSH.
- `docker-compose.prod.yml` — overrides app services to use `image:` tags for production.
- `scripts/deploy-registry.sh` — runs `check-env`, `docker compose pull`, and `docker compose up -d --no-build` with `IMAGE_TAG`.
- The workflow uses path filtering (`dorny/paths-filter`) to build only affected images; `workflow_dispatch` builds all images.
- Because changed-only builds may not produce every image for a commit SHA, deploys use the rolling `:main` tag for consistency across services.

Production image naming convention:

- `ghcr.io/<owner>/personal-website-main:<tag>`
- `ghcr.io/<owner>/personal-website-photos:<tag>`
- `ghcr.io/<owner>/personal-website-cms:<tag>`
- `ghcr.io/<owner>/personal-website-backend:<tag>`
- `ghcr.io/<owner>/personal-website-image-worker:<tag>`
- `ghcr.io/<owner>/personal-website-email-worker:<tag>`
- `ghcr.io/<owner>/personal-website-cleanup-worker:<tag>`
- `ghcr.io/<owner>/personal-website-migrate:<tag>`
- `ghcr.io/<owner>/personal-website-ops-bot:<tag>`

## GitHub secrets required

Set these repository secrets before enabling the workflow:

- `DROPLET_HOST` (server IP, e.g. `164.92.149.211`)
- `DROPLET_USER` (usually `root` or a deploy user)
- `DROPLET_SSH_KEY` (private key for SSH auth)
- `GHCR_USERNAME` (GitHub username that owns/has access to packages)
- `GHCR_PAT` (token with at least `read:packages` for pull on droplet)

## One-time droplet bootstrap

Run once on the droplet:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER" || true
```

Clone repo and create env:

```bash
sudo mkdir -p /opt
cd /opt
sudo git clone <your-repo-url> personal-website
sudo chown -R "$USER":"$USER" /opt/personal-website
cd /opt/personal-website
cp .env.production.example .env
# Fill real values in .env before first deploy.
```

Optional first manual deploy test:

```bash
echo "<GHCR_PAT>" | docker login ghcr.io -u "<GHCR_USERNAME>" --password-stdin
IMAGE_TAG=main ./scripts/deploy-registry.sh
```

## What gets containerized

Current Dockerfiles:

- Static sites (served by Nginx): `apps/main/Dockerfile`, `apps/photos/Dockerfile`, `apps/cms/Dockerfile`
- Backend API: `services/backend/Dockerfile`
- Workers: `services/image-worker/Dockerfile`, `services/email-worker/Dockerfile`, `services/cleanup-worker/Dockerfile`
- DB migrations job: `infra/Dockerfile` (used by the `migrate` service in `docker-compose.yml`)

## Registry (where the Droplet pulls from)

Pick a container registry (examples):

- GitHub Container Registry (GHCR): `ghcr.io/<owner>/<repo>-<service>:<tag>`
- DigitalOcean Container Registry (DOCR): `registry.digitalocean.com/<registry>/<service>:<tag>`

The important piece is: production Compose must use `image:` (not `build:`), e.g.

```yaml
services:
  backend:
    image: ghcr.io/<owner>/<repo>-backend:${IMAGE_TAG}
```

Then on the Droplet:

- `docker login <registry>` once (or whenever credentials rotate)
- `docker compose pull`
- `docker compose up -d`

## Tagging strategy

Use at least one immutable tag per build:

- `:<git-sha>` (recommended) — allows easy rollback.

Optionally add a moving tag for convenience:

- `:main` or `:latest` — always points at the latest successful build on that branch.

## Compose layout (dev vs prod)

Keep the current `docker-compose.yml` for local/dev where `build:` is convenient.

For production, add a second file (example name: `docker-compose.prod.yml`) that overrides each service with `image:` tags. Use a single tag variable:

- `IMAGE_TAG` (e.g. commit SHA)

Deploy with:

```bash
IMAGE_TAG=<sha> docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
IMAGE_TAG=<sha> docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build
```

## GitHub Actions flow (build + push)

High-level pipeline:

1. Checkout repo.
2. Enable Corepack (Yarn is pinned via `packageManager` in `package.json`).
3. Compute “what changed” (paths filter).
4. Build a list/matrix of images to build.
5. For each image:
   - Build with Docker Buildx
   - Push to registry
   - Use BuildKit cache to speed up subsequent builds

Recommended caching:

- Use `docker/build-push-action` with `cache-from: type=gha` and `cache-to: type=gha,mode=max`.
- If you run non-Docker Yarn steps in CI, use `actions/setup-node` with Yarn caching (`cache: yarn`) to reduce install time.

## Build only what changed (monorepo path mapping)

Typical mapping for this repo:

- **Rebuild all images** if any of these change:
  - `package.json`, `yarn.lock`, `.dockerignore`
- **Frontend images**
  - `apps/main/**` or `infra/nginx/**` ⇒ build `main`
  - `apps/photos/**` or `infra/nginx/**` ⇒ build `photos`
  - `apps/cms/**` or `infra/nginx/**` ⇒ build `cms`
- **Backend / DB**
  - `services/backend/**` ⇒ build `backend`
  - `packages/database/**` ⇒ build `backend`, `image-worker`, and `migrate` (Prisma client + migrations impact multiple services)
  - `infra/Dockerfile` ⇒ build `migrate`
- **Workers**
  - `services/image-worker/**` ⇒ build `image-worker`
  - `services/email-worker/**` ⇒ build `email-worker`
  - `services/cleanup-worker/**` ⇒ build `cleanup-worker`

Two modes you can choose between:

- **Strict** (fast): build only directly affected images (per mapping above).
- **Conservative** (safer): if a shared package changes, build all runtime images to catch integration breaks early (costs more minutes).

## Why CI builds help a 2GB / 1 vCPU Droplet

Building these images on the Droplet tends to be unreliable because:

- `yarn install` in a workspace monorepo is memory-hungry (native modules, postinstall scripts, large dependency trees).
- TypeScript/Nest builds can spike memory usage during compilation.
- Docker builds run in an isolated environment; if memory is tight, the kernel may kill build steps (`Killed`, exit code `137`).

When CI builds images:

- The Droplet does low-memory operations: pulling layers + starting containers.
- Deploys are faster and more repeatable.
- Rollbacks are straightforward: point `IMAGE_TAG` to a previous SHA and redeploy.

## Notes / pitfalls

- Keep builder/runtime Node versions aligned for native modules (especially `sharp`).
- Avoid using real secrets as Docker build args when possible (they can leak via build logs or image history). Prefer runtime env vars or BuildKit secrets for sensitive values.
- If images are private, the Droplet needs registry credentials (`docker login`) to pull them.
- On the Droplet, prevent disk issues over time:
  - Configure Docker log rotation so container logs can’t fill the disk (Ubuntu: `/etc/docker/daemon.json` with `json-file` `max-size`/`max-file`).
  - After successful deploys, consider pruning unused images to avoid “No space left on device”: `docker image prune -af` (don’t use `--volumes` unless you intend to delete volumes like Postgres data).
  - Monitor usage: `df -h` and `docker system df -v`.
