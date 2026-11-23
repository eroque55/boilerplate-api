# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app

FROM base AS build
COPY package.json yarn.lock prisma.config.ts ./
COPY prisma ./prisma
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM base AS production-deps
COPY package.json yarn.lock prisma.config.ts ./
COPY prisma ./prisma
RUN yarn install --frozen-lockfile --production && yarn cache clean

FROM base AS runner
ENV NODE_ENV=production
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
USER node
EXPOSE 3333
CMD ["sh", "-c", "yarn prisma migrate deploy && node dist/main"]
