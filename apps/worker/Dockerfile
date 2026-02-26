# ABOUTME: Multi-stage Docker build for the pleasehold background worker service.
# ABOUTME: Uses turbo prune for minimal monorepo context, processes notification jobs via BullMQ.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

FROM base AS pruner
RUN pnpm add -g turbo@2.4.4
WORKDIR /app
COPY . .
RUN turbo prune @pleasehold/worker --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

FROM installer AS builder
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.json ./tsconfig.json
RUN pnpm turbo build --filter=@pleasehold/worker...

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
COPY --from=builder /app/ .
USER appuser
CMD ["node", "apps/worker/dist/index.js"]
