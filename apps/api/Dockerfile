# ABOUTME: Multi-stage Docker build for the pleasehold API service.
# ABOUTME: Uses turbo prune for minimal monorepo context, runs on Node 22 Alpine.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

FROM base AS pruner
RUN pnpm add -g turbo@2.4.4
WORKDIR /app
COPY . .
RUN turbo prune @pleasehold/api --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

FROM installer AS builder
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.json ./tsconfig.json
RUN pnpm turbo build --filter=@pleasehold/api...

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser

# Install Infisical CLI (optional runtime secret injection)
RUN apk add --no-cache bash curl && \
    curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash && \
    apk add --no-cache infisical || true

ARG INFISICAL_CLIENT_ID
ARG INFISICAL_CLIENT_SECRET
ARG INFISICAL_PROJECT_ID
ARG INFISICAL_ENV=staging
ENV INFISICAL_CLIENT_ID=$INFISICAL_CLIENT_ID
ENV INFISICAL_CLIENT_SECRET=$INFISICAL_CLIENT_SECRET
ENV INFISICAL_PROJECT_ID=$INFISICAL_PROJECT_ID
ENV INFISICAL_ENV=$INFISICAL_ENV
ENV INFISICAL_DOMAIN=https://secrets.pixeltowers.io

COPY --from=builder /app/ .
COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER appuser
EXPOSE 3001
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["sh", "-c", "node packages/db/migrate.mjs && exec node apps/api/dist/index.js"]
