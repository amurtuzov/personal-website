
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/database/package.json ./packages/database/

# Install only dependencies needed for database migrations
RUN yarn workspaces focus @packages/database

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
