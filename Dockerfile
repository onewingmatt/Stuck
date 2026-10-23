# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Copy source
COPY src ./src
COPY server ./server
COPY public ./public
COPY index.html ./
COPY vite.config.ts ./
COPY eslint.config.js ./

# Install dependencies and build. `npm ci` (not `npm install`): install is allowed to REWRITE
# package-lock.json inside the builder, and the production stage then ships that rewrite — so the
# image carried a lockfile that is in no repo (verified 2026-10-23: repo bb1e911c, image 8c5d00d3).
# ci resolves exactly the committed lock and FAILS LOUDLY on a mismatch instead of papering over it.
RUN npm ci
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/package*.json ./

# Install production dependencies only (ci, same reason as above)
RUN npm ci --omit=dev

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist-server/server/server.js"]
