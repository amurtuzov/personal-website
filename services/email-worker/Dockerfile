FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.6.0 --activate

COPY package.json yarn.lock .yarnrc.yml ./
COPY services/email-worker/package.json ./services/email-worker/
RUN yarn workspaces focus @site/email-worker


# Copy source code and build only email worker
COPY . .
WORKDIR /app/services/email-worker
RUN yarn build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY package.json yarn.lock .yarnrc.yml ./
COPY services/email-worker/package.json ./services/email-worker/

RUN corepack enable && corepack prepare yarn@4.6.0 --activate
RUN yarn workspaces focus @site/email-worker --production

COPY --from=builder /app/services/email-worker/dist ./services/email-worker/dist

WORKDIR /app/services/email-worker
CMD ["node", "dist/index.js"]
