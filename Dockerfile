# 1) Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency files
COPY package*.json ./
# If you use pnpm or yarn, also copy their lockfiles and adjust commands below

RUN npm install

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

# Optional: custom nginx config to ensure SPA routing works
# (uncomment if you create nginx.conf in the repo)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8000

# Tell nginx to listen on 8000 instead of default 80
RUN sed -i 's/listen 80;/listen 8000;/' /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
