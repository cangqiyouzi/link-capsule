# ---- base ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- deps ----
# 使用官方 npm 源，确保 Zeabur 跨区域构建稳定
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmjs.org/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit

# ---- build ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- production ----
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# 运行时依赖（保留 drizzle-kit 以便启动时执行 migrate）
COPY --from=deps /app/node_modules ./node_modules
# 构建产物：前端静态资源 + 后端 bundle
COPY --from=build /app/dist ./dist
# drizzle 迁移文件 + 配置
COPY --from=build /app/db/migrations ./db/migrations
COPY --from=build /app/drizzle.config.ts ./
# 启动脚本与 package.json
COPY docker-entrypoint.sh ./
COPY package.json ./
# 修正 Windows 换行符，避免 alpine sh 解析失败
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
