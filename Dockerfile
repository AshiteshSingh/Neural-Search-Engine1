# --- Stage 1: Install Dependencies ---
# UPDATED: Changed from node:18-alpine to node:20-alpine
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package manager lock files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install dependencies based on the detected package manager
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# --- Stage 2: Build the Application ---
# UPDATED: Changed from node:18-alpine to node:20-alpine
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

# Build command
RUN npm run build

# --- Stage 3: Production Runner ---
# UPDATED: Changed from node:18-alpine to node:20-alpine
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set correct permissions for the Next.js cache directory
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage standalone output traces to reduce image size
# Ensure 'output: "standalone"' is set in next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Cloud Run expects port 8080
EXPOSE 8080
ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

# Start the server using the standalone entrypoint
CMD ["node", "server.js"]