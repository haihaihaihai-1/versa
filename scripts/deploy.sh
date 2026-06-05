#!/usr/bin/env bash
# ============================================
# Versa · 部署脚本 (v20.0)
# 支持: gh-pages | ssh | docker
# 用法: ./scripts/deploy.sh [target]
# ============================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# --- 参数与默认值 ---
TARGET="${1:-gh-pages}"
APP_NAME="versa"
VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")"

log() { printf "\033[1;36m[deploy]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[err ]\033[0m %s\n" "$*"; exit 1; }

log "Versa 部署脚本 v20.0"
log "目标: $TARGET, 版本: $VERSION"

# --- 预检 ---
[ -f package.json ] || err "未找到 package.json, 请在项目根目录运行"
[ -d dist ] && warn "dist/ 已存在, 将被覆盖"

# --- 构建 ---
log "构建生产包..."
npm ci --no-audit --no-fund
npm run build
[ -d dist ] || err "构建失败, dist/ 不存在"
log "✅ 构建完成 ($(du -sh dist 2>/dev/null | cut -f1))"

# --- 分支部署: GitHub Pages ---
deploy_gh_pages() {
  log "部署到 GitHub Pages..."
  [ -n "${GITHUB_TOKEN:-}" ] || warn "未设置 GITHUB_TOKEN, 将尝试用本地 git 凭证"
  git checkout -B gh-pages
  git add -f dist
  git commit -m "deploy: $APP_NAME v$VERSION ($(date +%Y-%m-%d))" --no-verify || true
  if git push -f origin gh-pages; then
    log "✅ 已推送到 gh-pages 分支"
  else
    err "推送失败, 请检查 git 远程仓库配置"
  fi
  git checkout main
}

# --- SSH 部署 ---
deploy_ssh() {
  : "${DEPLOY_SSH_HOST:?DEPLOY_SSH_HOST 未设置}"
  : "${DEPLOY_SSH_USER:?DEPLOY_SSH_USER 未设置}"
  : "${DEPLOY_REMOTE_DIR:?DEPLOY_REMOTE_DIR 未设置}"
  log "部署到 $DEPLOY_SSH_USER@$DEPLOY_SSH_HOST:$DEPLOY_REMOTE_DIR ..."
  rsync -avz --delete \
    --exclude='.git' \
    -e "ssh -o StrictHostKeyChecking=accept-new" \
    dist/ "$DEPLOY_SSH_USER@$DEPLOY_SSH_HOST:$DEPLOY_REMOTE_DIR/"
  log "✅ SSH 部署完成"
}

# --- Docker 部署 ---
deploy_docker() {
  log "构建 Docker 镜像..."
  docker build -t "$APP_NAME:$VERSION" -t "$APP_NAME:latest" .
  log "启动容器..."
  docker compose up -d --remove-orphans
  sleep 3
  docker ps --filter "name=$APP_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  log "✅ Docker 部署完成"
}

# --- 分发 ---
case "$TARGET" in
  gh-pages|gh) deploy_gh_pages ;;
  ssh)          deploy_ssh ;;
  docker)       deploy_docker ;;
  *)            err "未知目标: $TARGET (支持: gh-pages | ssh | docker)" ;;
esac

log "🎉 部署完成!"
