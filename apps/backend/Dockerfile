FROM node:24-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm
RUN corepack use pnpm@10.28.0
WORKDIR /app
COPY package.json .
COPY pnpm-lock.yaml .
COPY pnpm-workspace.yaml .
COPY apps/backend ./apps/backend
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter backend build
RUN pnpm --filter backend --prod --legacy deploy /prod/backend

FROM node:24-alpine AS runner
USER node
WORKDIR /app
COPY --from=builder --chown=node:node /prod/backend .
EXPOSE 3000
CMD [ "node", "build/server.js" ]
