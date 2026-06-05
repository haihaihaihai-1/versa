/**
 * Versa · 内容审核 (v18.0)
 *
 * 策略：
 * - 关键词黑名单 (中/英)
 * - 简单 NLP 规则 (URL 数量、大写比例、emoji 数量)
 * - 举报机制
 * - 人工复审队列
 */

export interface ContentItem {
  id: string
  type: 'post' | 'comment' | 'debate' | 'message' | 'product'
  text: string
  authorId: string
  createdAt: number
}

export interface ReviewResult {
  itemId: string
  action: 'approve' | 'reject' | 'flag' | 'shadow'
  reasons: string[]
  score: number  // 0-1, 越高越可疑
  auto: boolean
}

export interface Report {
  id: string
  targetType: 'post' | 'comment' | 'user' | 'product'
  targetId: string
  reason: 'spam' | 'abuse' | 'illegal' | 'nsfw' | 'other'
  description?: string
  reporterId: string
  ts: number
  status: 'pending' | 'reviewed' | 'dismissed'
}

// 关键词黑名单
const KEYWORD_BLOCKLIST = [
  '赌博', '博彩', '澳门威尼斯', '色情', '裸聊', '一夜情', '迷药',
  'casino', 'porn', 'viagra', 'escort',
]

const KEYWORD_REGEXES: RegExp[] = [
  /https?:\/\/[^\s]+/gi,                  // URLs
  /\b\d{10,}\b/g,                          // 长数字串 (可能是手机/QQ)
  /[A-Z]{20,}/g,                            // 长连续大写
  /(.)\1{5,}/g,                            // 连续重复字符
]

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}]/gu

export function reviewContent(item: ContentItem): ReviewResult {
  const reasons: string[] = []
  let score = 0
  const text = item.text || ''

  // 1. 关键词
  for (const k of KEYWORD_BLOCKLIST) {
    if (text.toLowerCase().includes(k.toLowerCase())) {
      reasons.push(`含黑名单词: ${k}`)
      score += 0.4
    }
  }

  // 2. URL 数量
  const urls = text.match(KEYWORD_REGEXES[0]) || []
  if (urls.length >= 3) {
    reasons.push(`链接过多 (${urls.length})`)
    score += 0.3
  } else if (urls.length > 0) {
    score += 0.1
  }

  // 3. 长数字串
  if (KEYWORD_REGEXES[1].test(text)) {
    reasons.push('可能含联系方式')
    score += 0.25
  }

  // 4. 大写比例
  const letters = text.match(/[A-Za-z]/g) || []
  const upper = text.match(/[A-Z]/g) || []
  if (letters.length >= 10 && upper.length / letters.length > 0.6) {
    reasons.push('大写比例过高')
    score += 0.2
  }

  // 5. 重复字符
  if (KEYWORD_REGEXES[3].test(text)) {
    reasons.push('连续重复字符')
    score += 0.15
  }

  // 6. emoji 数量
  const emojis = text.match(EMOJI_REGEX) || []
  if (emojis.length > 15) {
    reasons.push(`emoji 过多 (${emojis.length})`)
    score += 0.2
  }

  // 7. 短文本但是大流量
  if (text.length < 10 && emojis.length > 3) {
    reasons.push('极短+大量 emoji (刷屏嫌疑)')
    score += 0.2
  }

  score = Math.min(1, score)
  let action: ReviewResult['action'] = 'approve'
  if (score >= 0.7) action = 'reject'
  else if (score >= 0.4) action = 'flag'
  else if (score >= 0.2) action = 'shadow'

  return { itemId: item.id, action, reasons, score, auto: true }
}

class ModerationQueue {
  private items: Map<string, ReviewResult> = new Map()
  private reports: Report[] = []
  private listeners: Set<() => void> = new Set()

  submit(result: ReviewResult): void {
    this.items.set(result.itemId, result)
    this.notify()
  }

  review(itemId: string, action: ReviewResult['action'], reason: string, reviewerId: string): void {
    const r = this.items.get(itemId)
    if (!r) return
    r.action = action
    r.reasons.push(`[${reviewerId}] ${reason}`)
    r.auto = false
    this.notify()
  }

  list(filter?: { action?: ReviewResult['action']; minScore?: number }): ReviewResult[] {
    let r = Array.from(this.items.values())
    if (filter?.action) r = r.filter((x) => x.action === filter.action)
    if (filter?.minScore != null) r = r.filter((x) => x.score >= filter.minScore!)
    return r.sort((a, b) => b.score - a.score)
  }

  getByItemId(itemId: string): ReviewResult | undefined {
    return this.items.get(itemId)
  }

  addReport(report: Omit<Report, 'id' | 'ts' | 'status'>): Report {
    const r: Report = {
      ...report,
      id: 'rep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      status: 'pending',
    }
    this.reports.push(r)
    this.notify()
    return r
  }

  resolveReport(id: string, status: 'reviewed' | 'dismissed'): void {
    const r = this.reports.find((x) => x.id === id)
    if (r) r.status = status
    this.notify()
  }

  getReports(): Report[] {
    return this.reports.slice().reverse()
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  private notify() {
    this.listeners.forEach((fn) => fn())
  }
}

export const moderation = new ModerationQueue()
