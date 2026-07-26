# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY . .

# Build client (Vite) and server (esbuild)
RUN pnpm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:22-slim AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built output
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/patches/ ./patches/

# Install production dependencies only
RUN pnpm install --no-frozen-lockfile --prod

# The app listens on PORT (default 3000)
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
