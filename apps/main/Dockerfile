FROM node:20-alpine AS builder
WORKDIR /app

# API URL baked at build time for the contact form endpoint
ARG NUXT_PUBLIC_API_URL=http://localhost:4000
ENV NUXT_PUBLIC_API_URL=$NUXT_PUBLIC_API_URL

# Native deps fallback (e.g. bcrypt) needs build tools
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

# Copy repo source
COPY . .

# Build/generate static output
RUN if node -e "const p=require('./apps/main/package.json'); process.exit(p.scripts?.generate ? 0 : 1)"; then \
      yarn workspace @site/main generate; \
    else \
      yarn workspace @site/main build; \
    fi && \
    if [ -d /app/apps/main/.output/public ] && { [ -f /app/apps/main/.output/public/index.html ] || [ -f /app/apps/main/.output/public/200.html ]; }; then \
      rm -rf /app/apps/main/dist && cp -a /app/apps/main/.output/public /app/apps/main/dist; \
    fi

# runtime: serve with nginx
FROM nginx:stable-alpine AS runtime
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/apps/main/dist /usr/share/nginx/html
COPY infra/nginx/site.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
