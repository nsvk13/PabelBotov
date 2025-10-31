# STAGE 1 — BUILD
FROM oven/bun:1.1 AS build

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install

COPY . .

RUN bun build src/index.ts --target bun --outfile dist/index.js

# STAGE 2 — RUNTIME
FROM oven/bun:1.1

WORKDIR /app

COPY --from=build /app/dist ./dist

COPY package.json bun.lock ./

RUN bun install --production || true

ENV NODE_ENV=production

CMD ["bun", "run", "dist/index.js"]
