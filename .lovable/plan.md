

# Plan: Improve Dockerfile for Vite/React with Nginx

## Current State
A Dockerfile already exists in the project. However, it has two issues:
1. The `sed` command to change nginx port from 80 to 8000 may not work reliably
2. SPA (Single Page Application) routing is not configured - React Router routes will return 404 on page refresh

---

## Changes Required

### 1. Create Custom Nginx Configuration
**New file: `nginx.conf`**

A proper nginx config that:
- Listens on port 8000
- Serves the React app from `/usr/share/nginx/html`
- Handles SPA routing by returning `index.html` for all routes (so React Router can handle them)
- Sets proper caching headers for static assets
- Enables gzip compression for better performance

### 2. Update Dockerfile
**File: `Dockerfile`**

- Remove the unreliable `sed` command
- Copy the custom `nginx.conf` into the container
- Pass environment variables at build time using ARG/ENV for Vite

### 3. Fix docker-compose.yml Indentation
**File: `docker-compose.yml`**

- Fix the indentation issue with `env_file` (currently not properly nested under the `app` service)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `nginx.conf` | Create | Custom nginx config with port 8000 and SPA routing |
| `Dockerfile` | Update | Use custom nginx config, proper build args |
| `docker-compose.yml` | Update | Fix YAML indentation |

---

## Technical Details

### nginx.conf
```text
server {
    listen 8000;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing - return index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

### Dockerfile Updates
```text
# Build stage - pass VITE_ env vars as build args
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Serve stage - use custom nginx config
FROM nginx:1.27-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8000
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml Fix
```yaml
version: "3.9"

services:
  app:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
```

---

## Deployment Instructions

After these changes, deploy to your Hostinger VPS:

1. Push changes to GitHub
2. Pull on VPS: `git pull`
3. Build and run: `docker-compose up --build -d`
4. Access app at: `http://your-vps-ip:8000`

