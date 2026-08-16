# Multi-stage Dockerfile for Server Portal

# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine
WORKDIR /app

# Install docker compose CLI so portal controller can invoke compose commands
RUN apk add --no-cache docker-cli docker-cli-compose

# Copy backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./
COPY config/ /opt/apps/portal/config/

# Copy built frontend assets to dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

ENV PORT=8000
ENV NODE_ENV=production
EXPOSE 8000

CMD ["node", "src/server.js"]
