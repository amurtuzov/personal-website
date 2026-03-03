# Stage 1: Builder
FROM node:22-bookworm AS builder
WORKDIR /app

# Ensure Yarn is available (repo uses Corepack + `packageManager`)
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/main/package.json ./apps/main/
COPY apps/photos/package.json ./apps/photos/
COPY apps/cms/package.json ./apps/cms/
COPY services/backend/package.json ./services/backend/
COPY services/image-worker/package.json ./services/image-worker/
COPY services/email-worker/package.json ./services/email-worker/
COPY services/cleanup-worker/package.json ./services/cleanup-worker/
COPY services/ops-bot/package.json ./services/ops-bot/
COPY packages/database/package.json ./packages/database/

# Install dependencies
RUN yarn install --immutable

# Copy source code
COPY . .

# Build database package first (Prisma config requires DATABASE_URL to be set)
WORKDIR /app/packages/database
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public" yarn db:generate
RUN yarn build

# Build backend (kept for consistency with existing worker image)
WORKDIR /app/services/backend
RUN yarn build

# Build image-worker
WORKDIR /app/services/image-worker
RUN yarn build

# Stage 2: Runtime
FROM node:22-bookworm AS runtime

# Ensure Yarn is available (repo uses Corepack + `packageManager`)
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

WORKDIR /app

# Install production dependencies only
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/main/package.json ./apps/main/
COPY apps/photos/package.json ./apps/photos/
COPY apps/cms/package.json ./apps/cms/
COPY services/backend/package.json ./services/backend/
COPY services/image-worker/package.json ./services/image-worker/
COPY services/email-worker/package.json ./services/email-worker/
COPY services/cleanup-worker/package.json ./services/cleanup-worker/
COPY services/ops-bot/package.json ./services/ops-bot/
COPY packages/database/package.json ./packages/database/

RUN yarn workspaces focus @site/image-worker --production

# Copy built artifacts
COPY --from=builder /app/services/image-worker/dist ./services/image-worker/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/generated ./packages/database/generated
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Copy necessary config files
COPY packages/database/package.json ./packages/database/
COPY services/image-worker/package.json ./services/image-worker/

ENV NODE_ENV=production
WORKDIR /app/services/image-worker

CMD ["node", "dist/index.js"]
