FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.6.0 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY services/cleanup-worker/package.json ./services/cleanup-worker/
RUN yarn workspaces focus @site/cleanup-worker


COPY . .
WORKDIR /app/services/cleanup-worker
RUN yarn build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json yarn.lock .yarnrc.yml ./
COPY services/cleanup-worker/package.json ./services/cleanup-worker/

RUN corepack enable && corepack prepare yarn@4.6.0 --activate
RUN yarn workspaces focus @site/cleanup-worker --production

COPY --from=builder /app/services/cleanup-worker/dist ./services/cleanup-worker/dist

WORKDIR /app/services/cleanup-worker
CMD ["node", "dist/index.js"]
