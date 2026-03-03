FROM node:20-alpine AS builder
WORKDIR /app

# API URL baked at build time; default to localhost for dev
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copy package manifests first (better layer caching with yarn workspaces)
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

COPY . .

# CMS imports types from @packages/database; generate/build that workspace first.
RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public" yarn workspace @packages/database db:generate \
  && yarn workspace @packages/database build \
  && yarn workspace @site/cms build

FROM nginx:stable-alpine AS runtime
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/apps/cms/dist /usr/share/nginx/html
COPY infra/nginx/site.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
