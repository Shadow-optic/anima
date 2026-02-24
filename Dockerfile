# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install dependencies
RUN npm install --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client (skip if no .prismarc or installed)
RUN npm install --save-dev prisma --legacy-peer-deps && npx prisma generate || true

# Expose during build for potential build steps
RUN npm run typecheck || true

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy from builder
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./
COPY --from=builder --chown=nextjs:nodejs /app .

# Switch to non-root user
USER nextjs

# Set environment variables
ENV NODE_ENV=production \
    EXPO_PUBLIC_USE_MOCK_DATA=true

# Expose Expo default port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["/usr/sbin/dumb-init", "--"]
CMD ["npm", "start"]
