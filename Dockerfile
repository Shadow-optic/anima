# Builds the static website and serves it with nginx.
# Supabase settings are baked in at build time (they are public values):
#   docker build --build-arg EXPO_PUBLIC_SUPABASE_URL=... --build-arg EXPO_PUBLIC_SUPABASE_ANON_KEY=... -t anima .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG EXPO_PUBLIC_SUPABASE_URL=""
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY=""
ARG EXPO_PUBLIC_SITE_URL=""
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL \
    EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY \
    EXPO_PUBLIC_SITE_URL=$EXPO_PUBLIC_SITE_URL
RUN npm run build:web

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Single-page app: unknown paths fall back to index.html so deep links and share links work.
RUN printf 'server {\n  listen 8080;\n  root /usr/share/nginx/html;\n  add_header X-Content-Type-Options nosniff;\n  add_header X-Frame-Options DENY;\n  add_header Referrer-Policy strict-origin-when-cross-origin;\n  location /_expo/ { expires 1y; add_header Cache-Control "public, immutable"; }\n  location / { try_files $uri /index.html; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
