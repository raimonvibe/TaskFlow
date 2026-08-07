# Multi-stage Dockerfile for Node.js Backend
# Optimized for size and security

# Stage 1: Production dependencies (node:22-alpine tracks patched Node + Alpine releases)
FROM node:22-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: Build - compiles TypeScript to dist/
# Needs the full dependency set (typescript, @types/*), none of which ships.
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npm run build

# Stage 3: Development - what docker-compose builds (`target: dev`).
# Keeps the dev dependencies so tsx can run, and expects the source to be
# bind-mounted over /app, which is what makes `tsx watch` actually reload on
# change. Never used for a published image; the default build target is the
# runner stage below.
FROM node:22-alpine AS dev

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN mkdir -p logs

EXPOSE 3000

CMD ["npm", "run", "dev"]

# Stage 4: Production
FROM node:22-alpine AS runner

WORKDIR /app

# Upgrade all installed OS packages (narrow apk lists miss security fixes Trivy flags)
RUN apk update && apk upgrade --no-cache && apk add --no-cache dumb-init

# Remove npm and bundled global modules from runtime (not needed; reduces Trivy findings)
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy dependencies from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy the compiled output only. The image ships no TypeScript, no source,
# and no build tooling - and, unlike the previous `COPY . .`, no stray local
# files (.env, logs, a host node_modules) either.
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package.json ./

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
CMD ["node", "dist/main.js"]
