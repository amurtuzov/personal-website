# Stage 1: Builder
FROM node:22-bookworm AS builder
WORKDIR /app

# Ensure Yarn is available (repo uses Corepack + `packageManager`)
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY services/image-worker/package.json ./services/image-worker/
COPY packages/database/package.json ./packages/database/

# Install only dependencies needed to build image-worker + shared database package
RUN yarn workspaces focus @site/image-worker @packages/database

# Copy source code
COPY . .

# Build database package first (Prisma config requires DATABASE_URL to be set)
WORKDIR /app/packages/database
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public" yarn db:generate
RUN yarn build

# Build image-worker
WORKDIR /app/services/image-worker
RUN yarn build

# Stage 2: Runtime
FROM node:22-bookworm AS runtime

# Ensure Yarn is available (repo uses Corepack + `packageManager`)
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# HEIC/HEIF decode fallback utility used by image-worker at runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends libheif-examples \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production dependencies only
COPY package.json yarn.lock .yarnrc.yml ./
COPY services/image-worker/package.json ./services/image-worker/
COPY packages/database/package.json ./packages/database/

RUN yarn workspaces focus @site/image-worker --production

# Copy built artifacts
COPY --from=builder /app/services/image-worker/dist ./services/image-worker/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/generated ./packages/database/generated
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

ENV NODE_ENV=production
WORKDIR /app/services/image-worker

CMD ["node", "dist/index.js"]
