FROM node:20-alpine AS builder
WORKDIR /app

# API URL baked at build time; default to localhost for dev
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare yarn@4.6.0 --activate

COPY . .
RUN yarn install --immutable
RUN yarn workspace @site/cms build

FROM nginx:stable-alpine AS runtime
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/apps/cms/dist /usr/share/nginx/html
COPY infra/nginx/site.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
