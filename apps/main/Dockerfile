FROM node:22-alpine AS builder
WORKDIR /app

# API URL baked at build time for the contact form endpoint
ARG NUXT_PUBLIC_API_URL=http://localhost:4000
ENV NUXT_PUBLIC_API_URL=$NUXT_PUBLIC_API_URL

RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copy package manifests first (better layer caching with yarn workspaces)
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/main/package.json ./apps/main/

RUN yarn workspaces focus @site/main

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
