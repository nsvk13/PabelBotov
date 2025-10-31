# STAGE BUILD
FROM oven/bun:1.1 AS build
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun build src/index.ts --target bun --outfile dist/index.js

# STAGE DEPLOY PROD
FROM oven/bun:1.1
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY package.json bun.lockb ./

ENV NODE_ENV=production
CMD ["bun", "run", "dist/index.js"]