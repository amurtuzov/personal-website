FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.6.0 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY services/ops-bot/package.json ./services/ops-bot/
RUN yarn workspaces focus @site/ops-bot


COPY . .
WORKDIR /app/services/ops-bot
RUN yarn build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache docker-cli docker-cli-compose
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY services/ops-bot/package.json ./services/ops-bot/

RUN yarn workspaces focus @site/ops-bot --production

COPY --from=builder /app/services/ops-bot/dist ./services/ops-bot/dist

WORKDIR /app/services/ops-bot
CMD ["node", "dist/index.js"]
