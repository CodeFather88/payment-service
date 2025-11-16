FROM node:24-alpine AS deps

RUN npm install -g pnpm tsx

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS runner

RUN npm install -g tsx
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY src ./src

CMD ["tsx", "src/server.ts"]
