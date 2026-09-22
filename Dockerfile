FROM node:22-bookworm-slim AS base
WORKDIR /app

# Step 1: Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Step 2: Build Next.js application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Step 3: Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/proposera.sqlite
ENV MEDIA_STORAGE_PATH=/app/data/media

# Ensure persistent data directory structure exists
RUN mkdir -p /app/data/media/ready /app/data/media/staging

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/lib ./lib

VOLUME ["/app/data"]

EXPOSE 3000

CMD ["npm", "run", "start"]
