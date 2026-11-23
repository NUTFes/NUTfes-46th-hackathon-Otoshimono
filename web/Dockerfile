FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
# 起動のたびに未適用のマイグレーションを適用してから Next.js を起動する
CMD ["sh", "-c", "npm run db:migrate && exec npm run start -- --hostname 0.0.0.0"]
