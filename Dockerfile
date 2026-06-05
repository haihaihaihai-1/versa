# ============================================
# Versa · Multi-stage Dockerfile (v20.0)
# ============================================
# Stage 1: Build with Node 20
# Stage 2: Serve with nginx (alpine)
# ============================================

# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# 复制 lock 文件以利用缓存
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# 复制源码 + 构建
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM nginx:1.27-alpine AS runtime

# 自定义 nginx 配置
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# 从 build 阶段复制产物
COPY --from=build /app/dist /usr/share/nginx/html

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost:80/ || exit 1

EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
