# Build from the repo root: docker build -f apps/bff/Dockerfile -t frontline-bff .
FROM node:22-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter bff build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /repo/apps/bff/.next/standalone ./
COPY --from=build /repo/apps/bff/.next/static ./apps/bff/.next/static
EXPOSE 8080
CMD ["node", "apps/bff/server.js"]
