// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..')

describe('DevOps 配置 (v20.0)', () => {
  it('Dockerfile 存在且为多阶段', () => {
    const f = join(ROOT, 'Dockerfile')
    expect(existsSync(f)).toBe(true)
    const c = readFileSync(f, 'utf-8')
    expect(c).toContain('FROM node:20-alpine AS build')
    expect(c).toContain('FROM nginx:1.27-alpine AS runtime')
    expect(c).toContain('npm ci')
    expect(c).toContain('npm run build')
  })

  it('nginx 配置正确', () => {
    const f = join(ROOT, 'docker', 'nginx.conf')
    expect(existsSync(f)).toBe(true)
    const c = readFileSync(f, 'utf-8')
    expect(c).toContain('gzip on')
    expect(c).toContain('try_files $uri $uri/ /index.html')
    expect(c).toContain('X-Frame-Options')
    expect(c).toContain('Cache-Control')
    expect(c).toContain('sw.js')
  })

  it('docker-compose 含 app + pocketbase', () => {
    const f = join(ROOT, 'docker-compose.yml')
    expect(existsSync(f)).toBe(true)
    const c = readFileSync(f, 'utf-8')
    expect(c).toContain('services:')
    expect(c).toContain('app:')
    expect(c).toContain('pocketbase:')
    expect(c).toContain('versa-net')
  })

  it('.dockerignore 存在且排除 node_modules', () => {
    const f = join(ROOT, '.dockerignore')
    expect(existsSync(f)).toBe(true)
    const c = readFileSync(f, 'utf-8')
    expect(c).toContain('node_modules')
    expect(c).toContain('dist')
    expect(c).toContain('.git')
  })

  it('.env.example 含所有必要变量', () => {
    const f = join(ROOT, '.env.example')
    expect(existsSync(f)).toBe(true)
    const c = readFileSync(f, 'utf-8')
    expect(c).toContain('VITE_BASE_URL')
    expect(c).toContain('VITE_PB_URL')
    expect(c).toContain('VITE_OPENAI_API_KEY')
    expect(c).toContain('VITE_SENTRY_DSN')
  })

  it('deploy.sh 存在且可执行', () => {
    const f = join(ROOT, 'scripts', 'deploy.sh')
    expect(existsSync(f)).toBe(true)
    const c = readFileSync(f, 'utf-8')
    expect(c).toContain('#!/usr/bin/env bash')
    expect(c).toContain('gh-pages')
    expect(c).toContain('ssh')
    expect(c).toContain('docker')
    expect(c).toContain('set -euo pipefail')
  })

  it('CI workflow deploy.yml 存在', () => {
    const f = join(ROOT, '.github', 'workflows', 'deploy.yml')
    expect(existsSync(f)).toBe(true)
    const c = readFileSync(f, 'utf-8')
    expect(c).toContain('name: deploy')
    expect(c).toContain('on:')
    expect(c).toContain('gh-pages')
    expect(c).toContain('docker/build-push-action')
    expect(c).toContain('actions/deploy-pages')
  })

  it('所有 v20 文件清单', () => {
    const required = [
      'Dockerfile',
      'docker/nginx.conf',
      'docker-compose.yml',
      '.dockerignore',
      '.env.example',
      'scripts/deploy.sh',
      '.github/workflows/deploy.yml',
    ]
    for (const r of required) {
      expect(existsSync(join(ROOT, r))).toBe(true)
    }
  })
})
