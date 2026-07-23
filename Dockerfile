# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:24-slim AS builder

# Use the pnpm version pinned in package.json through Corepack.
RUN npm install -g corepack@latest && corepack enable

WORKDIR /app

# Install dependencies. pnpm-workspace.yaml contains security overrides recorded
# in pnpm-lock.yaml and must be present for frozen installs.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ ./patches/
RUN corepack pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build client (Vite) and server (esbuild)
RUN corepack pnpm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:24-slim AS runner

RUN npm install -g corepack@latest && corepack enable

WORKDIR /app

# Copy built output
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/patches/ ./patches/

# Install production dependencies only
RUN corepack pnpm install --frozen-lockfile --prod

# The app listens on PORT (default 3000)
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js"]
