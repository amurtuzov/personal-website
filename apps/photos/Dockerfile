FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.6.0 --activate

# Copy package manifests first (better layer caching with yarn workspaces)
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/photos/package.json ./apps/photos/

RUN yarn workspaces focus @site/photos

# Copy repo source
COPY . .

# Build Nuxt SSR output
RUN yarn workspace @site/photos build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

# Non-root runtime user
RUN addgroup -S nodejs && adduser -S nuxt -G nodejs

COPY --from=builder /app/apps/photos/.output ./.output

USER nuxt
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
