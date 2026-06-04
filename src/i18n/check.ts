/// <reference types="node" />
/**
 * Versa · 翻译完整性检查 CI 工具 (v10.1)
 * 用法：node --import tsx src/i18n/check.ts
 * 退出码：缺失键时返回 1
 * @ts-check
 */
import * as fs from 'fs'
import * as path from 'path'

const LOCALES_DIR = path.join(__dirname, 'locales')
const BASE = 'zh-CN.json'

interface Dict { [k: string]: any }

function flatten(obj: Dict, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) return flatten(v, key)
    return [key]
  })
}

function main() {
  const base = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, BASE), 'utf8')) as Dict
  const baseKeys = new Set(flatten(base))
  const files = fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json') && f !== BASE)

  let exitCode = 0
  for (const f of files) {
    const target = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, f), 'utf8')) as Dict
    const targetKeys = new Set(flatten(target))
    const missing: string[] = []
    for (const k of baseKeys) {
      if (!targetKeys.has(k)) missing.push(k)
    }
    const extra: string[] = []
    for (const k of targetKeys) {
      if (!baseKeys.has(k)) extra.push(k)
    }
    if (missing.length || extra.length) {
      console.warn(`\n[${f}]`)
      if (missing.length) {
        console.warn(`  ❌ missing (${missing.length}):`)
        missing.forEach((k) => console.warn(`    - ${k}`))
        exitCode = 1
      }
      if (extra.length) {
        console.warn(`  ⚠️  extra (${extra.length}):`)
        extra.forEach((k) => console.warn(`    + ${k}`))
      }
    } else {
      console.info(`[${f}] ✅ complete (${targetKeys.size} keys)`)
    }
  }
  process.exit(exitCode)
}

main()
