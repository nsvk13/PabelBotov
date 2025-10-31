# STAGE BUILD
FROM oven/bun:1.1 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun build src/index.ts --target bun --outfile dist/index.js

# STAGE RUN
FROM oven/bun:1.1
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY package.json bun.lock ./

ENV NODE_ENV=production
RUN bun install --frozen-lockfile --production
CMD ["bun", "run", "dist/index.js"]
