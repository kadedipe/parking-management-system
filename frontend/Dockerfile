# ============================================================================
# Dockerfile for Parking Management System Frontend
# ============================================================================
#
# This Dockerfile provides a multi-stage build for the React frontend application.
# It includes:
# - Development environment setup
# - Production build optimization
# - Nginx serving for production
# - Health checks
# - Security hardening
#
# ============================================================================

# ============================================================================
# Stage 1: Base
# ============================================================================

FROM node:20-alpine AS base

# Install necessary packages for security and performance
RUN apk add --no-cache \
    curl \
    tini \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=development \
    PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH"

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# ============================================================================
# Stage 2: Dependencies
# ============================================================================

FROM base AS deps

# Copy package files
COPY package.json pnpm-lock.yaml .npmrc* ./

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod=false --no-cache

# ============================================================================
# Stage 3: Builder
# ============================================================================

FROM deps AS builder

# Copy source code
COPY . .

# Build environment variables
ARG VITE_API_URL
ARG VITE_APP_NAME
ARG VITE_APP_DESCRIPTION
ARG VITE_ENVIRONMENT
ARG VITE_WEBSOCKET_URL
ARG VITE_GOOGLE_ANALYTICS_ID
ARG VITE_SENTRY_DSN

# Set build environment variables
ENV VITE_API_URL=${VITE_API_URL:-http://localhost:8000} \
    VITE_APP_NAME=${VITE_APP_NAME:-"Parking Management System"} \
    VITE_APP_DESCRIPTION=${VITE_APP_DESCRIPTION:-"A comprehensive parking management system"} \
    VITE_ENVIRONMENT=${VITE_ENVIRONMENT:-production} \
    VITE_WEBSOCKET_URL=${VITE_WEBSOCKET_URL:-ws://localhost:8000/ws} \
    VITE_GOOGLE_ANALYTICS_ID=${VITE_GOOGLE_ANALYTICS_ID:-""} \
    VITE_SENTRY_DSN=${VITE_SENTRY_DSN:-""}

# Build the application
RUN pnpm run build

# ============================================================================
# Stage 4: Production Runtime
# ============================================================================

FROM nginx:1.25-alpine AS production

# Install necessary packages
RUN apk add --no-cache \
    curl \
    tini \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create nginx user/group if not exists
RUN addgroup -g 101 -S nginx && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Copy built assets from builder
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# ============================================================================
# Nginx Configuration
# ============================================================================

# Create nginx configuration directory
RUN mkdir -p /etc/nginx/conf.d /etc/nginx/snippets

# Copy custom nginx configuration
COPY <<'EOF' /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    multi_accept on;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    '$request_time $upstream_response_time';

    access_log /var/log/nginx/access.log main;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # HSTS (enable only in production with proper SSL)
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Performance settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;
    client_body_timeout 60;
    client_header_timeout 60;
    send_timeout 60;
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Include server configuration
    include /etc/nginx/conf.d/*.conf;
}
EOF

# Copy server configuration
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
        access_log off;
    }

    # Cache HTML files (short duration)
    location ~* \.(html|htm)$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # API proxy (optional - for development)
    location /api/ {
        # Uncomment and configure for API proxying
        # proxy_pass http://backend:8000/api/;
        # proxy_http_version 1.1;
        # proxy_set_header Upgrade $http_upgrade;
        # proxy_set_header Connection 'upgrade';
        # proxy_set_header Host $host;
        # proxy_cache_bypass $http_upgrade;
        # proxy_set_header X-Real-IP $remote_addr;
        # proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting for API
        # limit_req zone=api burst=20 nodelay;
        
        return 404;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Favicon and robots
    location = /favicon.ico {
        access_log off;
        log_not_found off;
    }
    
    location = /robots.txt {
        access_log off;
        log_not_found off;
    }

    # SPA fallback (serve index.html for all routes)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

# ============================================================================
# Create health check script
# ============================================================================

RUN echo '#!/bin/sh\n\
curl -f http://localhost/health || exit 1' > /healthcheck.sh && \
    chmod +x /healthcheck.sh

# ============================================================================
# Set up entrypoint
# ============================================================================

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# ============================================================================
# Health Check
# ============================================================================

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /healthcheck.sh

# ============================================================================
# Expose port
# ============================================================================

EXPOSE 80

# ============================================================================
# Start nginx
# ============================================================================

CMD ["nginx", "-g", "daemon off;"]