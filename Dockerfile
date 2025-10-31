FROM oven/bun:1.1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

ENV NODE_ENV=production

CMD ["bun", "src/index.ts"]