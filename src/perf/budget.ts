/**
 * Versa · 性能预算与门禁 (v12.0)
 * 提供 build 时检查 + 运行时检查
 */
export const PERF_BUDGETS = {
  // Bundle
  maxJsBundleKb: 800,         // 主包 < 800KB (gzipped)
  maxCssBundleKb: 50,         // CSS < 50KB
  maxRouteChunkKb: 100,       // 单个路由 chunk < 100KB
  // Runtime
  maxFcpMs: 1800,             // First Contentful Paint
  maxLcpMs: 2500,             // Largest Contentful Paint
  maxClsScore: 0.1,           // Cumulative Layout Shift
  maxInpMs: 200,              // Interaction to Next Paint
  maxTtiMs: 3500,             // Time to Interactive
  // Resources
  maxImageKb: 200,            // 单张图
  maxFontKb: 100,             // 单个字体文件
  // Network
  maxRequests: 50,            // 首屏请求数
  maxThirdPartyKb: 100,       // 第三方脚本
} as const

export function checkBudget(actual: { jsKb: number; cssKb: number; fcpMs?: number; lcpMs?: number; clsScore?: number }): { passed: boolean; violations: string[] } {
  const violations: string[] = []
  if (actual.jsKb > PERF_BUDGETS.maxJsBundleKb) {
    violations.push(`JS bundle ${actual.jsKb.toFixed(0)}KB > ${PERF_BUDGETS.maxJsBundleKb}KB`)
  }
  if (actual.cssKb > PERF_BUDGETS.maxCssBundleKb) {
    violations.push(`CSS bundle ${actual.cssKb.toFixed(0)}KB > ${PERF_BUDGETS.maxCssBundleKb}KB`)
  }
  if (actual.fcpMs !== undefined && actual.fcpMs > PERF_BUDGETS.maxFcpMs) {
    violations.push(`FCP ${actual.fcpMs.toFixed(0)}ms > ${PERF_BUDGETS.maxFcpMs}ms`)
  }
  if (actual.lcpMs !== undefined && actual.lcpMs > PERF_BUDGETS.maxLcpMs) {
    violations.push(`LCP ${actual.lcpMs.toFixed(0)}ms > ${PERF_BUDGETS.maxLcpMs}ms`)
  }
  if (actual.clsScore !== undefined && actual.clsScore > PERF_BUDGETS.maxClsScore) {
    violations.push(`CLS ${actual.clsScore.toFixed(3)} > ${PERF_BUDGETS.maxClsScore}`)
  }
  return { passed: violations.length === 0, violations }
}
