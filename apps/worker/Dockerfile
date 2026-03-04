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
# Strip per-package zod overrides that reference packages not in the pruned workspace;
# only the global "zod" override applies in Docker builds.
RUN node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); \
  if(p.pnpm?.overrides){const o=p.pnpm.overrides; \
  Object.keys(o).forEach(k=>{if(k!=='zod')delete o[k]}); \
  require('fs').writeFileSync('package.json',JSON.stringify(p,null,2))}"
RUN pnpm install --frozen-lockfile

FROM installer AS builder
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.json ./tsconfig.json
RUN pnpm turbo build --filter=@pleasehold/worker...

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser

# Install Infisical CLI (optional runtime secret injection)
RUN apk add --no-cache bash curl && \
    curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash && \
    apk add --no-cache infisical || true

# Infisical credentials must be provided at runtime (docker run -e / k8s secrets),
# NOT baked into the image. Only INFISICAL_DOMAIN is safe to set as a default.
ENV INFISICAL_DOMAIN=https://secrets.pixeltowers.io

COPY --from=builder /app/ .
COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER appuser
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["sh", "-c", "node packages/db/migrate.mjs && exec node apps/worker/dist/index.js"]
