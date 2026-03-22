FROM node:22-alpine AS builder
WORKDIR /app

# API URL baked at build time; default to localhost for dev
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL

RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copy package manifests first (better layer caching with yarn workspaces)
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/cms/package.json ./apps/cms/
COPY packages/database/package.json ./packages/database/

RUN yarn workspaces focus @site/cms @packages/database

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
