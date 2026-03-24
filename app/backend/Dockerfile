# Multi-stage Dockerfile for Node.js Backend
# Optimized for size and security

# Stage 1: Dependencies (Alpine 3.22+ for OpenSSL CVE-2025-15467 fix)
FROM node:22-alpine3.22 AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Upgrade npm to pull in patched tar/minimatch transitive dependencies in base tooling
RUN npm install -g npm@latest

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: Production (Alpine 3.22+ for OpenSSL CVE-2025-15467 fix)
FROM node:22-alpine3.22 AS runner

WORKDIR /app

# Update base image packages to fix security vulnerabilities (OpenSSL, BusyBox, etc.)
RUN apk update && apk upgrade --no-cache openssl libxml2 curl expat tiff busybox && \
    apk add --no-cache dumb-init

# Upgrade npm in runtime image as well (Trivy scans system/node toolchain packages)
RUN npm install -g npm@latest && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy dependencies from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
