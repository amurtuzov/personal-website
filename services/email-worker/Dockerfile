FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files (for yarn workspaces)
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

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

RUN yarn install --immutable

# Copy source code and build only email worker
COPY . .
WORKDIR /app/services/email-worker
RUN yarn build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

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

RUN corepack enable && corepack prepare yarn@4.6.0 --activate
RUN apk add --no-cache --virtual .gyp python3 make g++ \
  && yarn workspaces focus @site/email-worker --production \
  && apk del .gyp

COPY --from=builder /app/services/email-worker/dist ./services/email-worker/dist

WORKDIR /app/services/email-worker
CMD ["node", "dist/index.js"]
