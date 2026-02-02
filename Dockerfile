# 1) Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Build args for Vite environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

# Copy dependency files
COPY package*.json ./

RUN npm ci --legacy-peer-deps

# Copy the rest of the source
COPY . .

# Build the production bundle (Vite)
RUN npm run build

# 2) Serve stage
FROM nginx:1.27-alpine

# Remove default nginx static site
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config for SPA routing and port 8000
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8000

CMD ["nginx", "-g", "daemon off;"]
