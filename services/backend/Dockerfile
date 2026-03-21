# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./
COPY services/backend/package.json ./services/backend/
COPY packages/database/package.json ./packages/database/

# Install only dependencies needed to build backend + shared database package
RUN yarn workspaces focus @site/backend @packages/database

# Copy source code
COPY . .

# Build database package first (Prisma config requires DATABASE_URL to be set)
WORKDIR /app/packages/database
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public" yarn db:generate
RUN yarn build

# Build backend
WORKDIR /app/services/backend
RUN yarn build


# Stage 2: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app


# Install production dependencies only
COPY package.json yarn.lock .yarnrc.yml ./
COPY services/backend/package.json ./services/backend/
COPY packages/database/package.json ./packages/database/

RUN corepack enable && corepack prepare yarn@4.6.0 --activate
RUN yarn workspaces focus @site/backend --production

# Copy built artifacts
COPY --from=builder /app/services/backend/dist ./services/backend/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/generated ./packages/database/generated
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

ENV NODE_ENV=production
WORKDIR /app/services/backend
EXPOSE 4000

CMD ["node", "dist/main.js"]
