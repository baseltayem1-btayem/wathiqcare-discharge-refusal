# ─── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install build dependencies only (no curl/wget leaking into final image)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY . .

RUN npm run prisma:generate
RUN npm run build

# ─── Stage 2: Production image ───────────────────────────────────────────────
FROM node:20-alpine AS production

# Non-root user for container security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only production dependencies manifest
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output and Prisma artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Run as non-root
USER appuser

EXPOSE 4000

# Run migrations then start the service
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
