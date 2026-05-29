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

# Install dependencies and build
RUN npm install
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist-server/server/server.js"]
