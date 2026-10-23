# All-in-one image (API + built web app on one port). Used for cloud playgrounds (Render, Fly, Railway, any
# container host) and by the "api" service in docker-compose. Node 22 ships node:sqlite, so no native builds.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund
COPY . .
RUN rm -f data/gateline.db* && npm run build -w @gateline/web && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DB_PATH=/data/gateline.db
COPY --from=build /app /app
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s CMD node -e "fetch('http://localhost:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--no-warnings", "apps/server/src/index.js"]
