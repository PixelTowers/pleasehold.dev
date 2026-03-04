# ABOUTME: Multi-stage Docker build for the pleasehold web dashboard.
# ABOUTME: Builds the React SPA with Vite, serves static files via nginx with API reverse proxy.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

FROM base AS pruner
RUN pnpm add -g turbo@2.4.4
WORKDIR /app
COPY . .
RUN turbo prune @pleasehold/web --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
# Strip per-package zod overrides that reference packages not in the pruned workspace;
# only the global "zod" override applies in Docker builds.
# Must patch both package.json AND pnpm-lock.yaml so --frozen-lockfile sees matching config.
RUN node -e "\
  const fs=require('fs');\
  const p=JSON.parse(fs.readFileSync('package.json','utf8'));\
  if(p.pnpm?.overrides){const o=p.pnpm.overrides;\
  Object.keys(o).forEach(k=>{if(k!=='zod')delete o[k]});\
  fs.writeFileSync('package.json',JSON.stringify(p,null,2))}\
  const lf=fs.readFileSync('pnpm-lock.yaml','utf8');\
  const lines=lf.split('\n');let i=0;const out=[];\
  while(i<lines.length){\
    if(lines[i]==='overrides:'){out.push(lines[i]);i++;\
      while(i<lines.length&&lines[i].startsWith('  ')){\
        if(lines[i].match(/^  zod:/)){out.push(lines[i])}\
        i++}\
    }else{out.push(lines[i]);i++}}\
  fs.writeFileSync('pnpm-lock.yaml',out.join('\n'));"
RUN pnpm install --frozen-lockfile

FROM installer AS builder
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.json ./tsconfig.json
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm turbo build --filter=@pleasehold/web...

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
