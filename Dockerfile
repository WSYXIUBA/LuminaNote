# 肆一纸心の栖息居 —— Docker 镜像
# 构建：docker build -t siyizhixin-habitat .
# 运行：docker compose up -d（推荐，见 docker-compose.yml）
#
# 数据持久化（容器外挂载卷）：
#   ./data    -> /app/data    SQLite 数据库（dev.db）
#   ./uploads -> /app/uploads 用户上传文件（壁纸等）

# ---------- 构建阶段 ----------
FROM node:20-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 先装依赖（利用 Docker 层缓存）
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码并构建
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- 运行阶段 ----------
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 复制依赖与构建产物（node_modules 完整保留：next start + prisma CLI + sharp 运行库）
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/postcss.config.mjs ./postcss.config.mjs

# 上传目录（挂载卷持久化，见 docker-compose.yml）
RUN mkdir -p /app/uploads

EXPOSE 3000
CMD ["npm", "run", "start"]
