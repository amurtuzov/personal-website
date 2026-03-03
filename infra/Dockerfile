
FROM node:20-alpine AS builder
WORKDIR /app

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

# Copy database package
COPY packages/database ./packages/database

# Generate Prisma client with DATABASE_URL set inline
WORKDIR /app/packages/database
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public" yarn db:generate

# Runtime
FROM node:20-alpine AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copy everything from builder
COPY --from=builder /app ./

WORKDIR /app/packages/database

CMD ["yarn", "db:migrate:deploy"]
