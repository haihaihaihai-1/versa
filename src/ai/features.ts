/**
 * Versa · 5 大 AI 功能模块 (v11.0)
 *
 * 1. AI 导购 (shopper) - 自然语言 → 推荐组合
 * 2. AI 辩论陪练 (coach) - 反方陪练 + 论点评分
 * 3. AI 资讯摘要 (brief) - 长文 → 3 行摘要
 * 4. AI 写作 (writer) - 帖子/评论/描述生成
 * 5. 跨模块推荐 (recommend) - 浏览/收藏融合
 */

import { ai, trackCost, type ChatMessage } from './provider'

// ============== 1. AI 导购 ==============

export interface ShopRequest {
  query: string
  budget?: number
  preferences?: string[]
  history?: Array<{ productId: string; action: 'view' | 'cart' | 'purchase' }>
}

export interface ShopRecommendation {
  productId: string
  reason: string
  score: number
}

export interface ShopResult {
  intro: string
  recommendations: ShopRecommendation[]
  tips: string[]
}

const SHOPPER_SYSTEM = `你是 Versa AI 导购。请根据用户需求给出 3-5 个推荐组合,每个推荐说明理由,最后给出 1-2 条购物建议。回复格式(JSON):
{
  "intro": "一句话总结用户需求",
  "recommendations": [{"productId":"?", "reason":"...", "score": 0-100}],
  "tips": ["购物建议1", "购物建议2"]
}`

export async function shopper(req: ShopRequest): Promise<ShopResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SHOPPER_SYSTEM },
    { role: 'user', content: `需求：${req.query}\n预算：${req.budget || '不限'}\n偏好：${(req.preferences || []).join(', ') || '无'}` },
  ]
  const r = await ai.complete(messages, { maxTokens: 600, temperature: 0.6 })
  trackCost(r.usage, r.cost)
  try {
    return JSON.parse(r.text)
  } catch {
    return { intro: r.text, recommendations: [], tips: [] }
  }
}

// ============== 2. AI 辩论陪练 ==============

export interface CoachRequest {
  topic: string
  userSide: 'pro' | 'con'
  userArgument: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface CoachResult {
  counterArgument: string
  weakPoints: string[]
  strongPoints: string[]
  score: number
  suggestions: string[]
}

const COACH_SYSTEM = `你是 Versa 辩论教练,与用户立场相反。先用 3 句话反驳用户观点,再指出其论点的 2 个薄弱点,1 个亮点,最后给 0-100 的论证质量分,和 2 条改进建议。回复格式(JSON):
{
  "counterArgument": "...",
  "weakPoints": ["..."],
  "strongPoints": ["..."],
  "score": 75,
  "suggestions": ["...", "..."]
}`

export async function coach(req: CoachRequest): Promise<CoachResult> {
  const opposite = req.userSide === 'pro' ? 'con' : 'pro'
  const messages: ChatMessage[] = [
    { role: 'system', content: COACH_SYSTEM },
    { role: 'user', content: `辩题：${req.topic}\n用户立场：${req.userSide} (我要当 ${opposite} 方陪练)\n用户论点：${req.userArgument}\n难度：${req.difficulty}` },
  ]
  const r = await ai.complete(messages, { maxTokens: 700, temperature: 0.8 })
  trackCost(r.usage, r.cost)
  try {
    return JSON.parse(r.text)
  } catch {
    return {
      counterArgument: r.text,
      weakPoints: [],
      strongPoints: [],
      score: 60,
      suggestions: [],
    }
  }
}

// ============== 3. AI 资讯摘要 ==============

export interface BriefRequest {
  title: string
  content: string
  maxWords?: number
}

export interface BriefResult {
  summary: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  keyPoints: string[]
  tags: string[]
  relatedTopics: string[]
}

const BRIEF_SYSTEM = `你是 Versa 资讯摘要助手。请从给定文章提取：
1. 3 行核心摘要 (不超过 200 字)
2. 整体情感倾向
3. 3-5 个关键要点
4. 3 个标签
5. 2-3 个相关讨论话题
回复格式(JSON):
{
  "summary": ["...", "...", "..."],
  "sentiment": "positive|neutral|negative",
  "keyPoints": ["...", "...", "..."],
  "tags": ["...", "..."],
  "relatedTopics": ["..."]
}`

export async function brief(req: BriefRequest): Promise<BriefResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: BRIEF_SYSTEM },
    { role: 'user', content: `标题：${req.title}\n正文：${req.content.slice(0, 3000)}` },
  ]
  const r = await ai.complete(messages, { maxTokens: 500, temperature: 0.3 })
  trackCost(r.usage, r.cost)
  try {
    return JSON.parse(r.text)
  } catch {
    return { summary: [r.text], sentiment: 'neutral', keyPoints: [], tags: [], relatedTopics: [] }
  }
}

// ============== 4. AI 写作 ==============

export type WriteType = 'post' | 'comment' | 'product_description' | 'debate_argument' | 'bio'

export interface WriteRequest {
  type: WriteType
  topic: string
  context?: string
  tone?: 'casual' | 'professional' | 'funny' | 'serious'
  length?: 'short' | 'medium' | 'long'
  keywords?: string[]
}

export interface WriteResult {
  content: string
  alternatives: string[]
  hashtags: string[]
  estimatedEngagement: number
}

const WRITER_SYSTEM = `你是 Versa AI 写手。根据用户要求生成内容,并提供 2 个备选版本、3-5 个相关 hashtag、0-100 的预估互动量评分。回复格式(JSON):
{
  "content": "主要版本",
  "alternatives": ["备选1", "备选2"],
  "hashtags": ["#tag1", "#tag2"],
  "estimatedEngagement": 75
}`

export async function writer(req: WriteRequest): Promise<WriteResult> {
  const messages: ChatMessage[] = [
    { role: 'system', content: WRITER_SYSTEM },
    { role: 'user', content: `类型：${req.type}\n主题：${req.topic}\n上下文：${req.context || '无'}\n语气：${req.tone || 'casual'}\n长度：${req.length || 'medium'}\n关键词：${(req.keywords || []).join(', ') || '无'}` },
  ]
  const r = await ai.complete(messages, { maxTokens: 600, temperature: 0.9 })
  trackCost(r.usage, r.cost)
  try {
    return JSON.parse(r.text)
  } catch {
    return { content: r.text, alternatives: [], hashtags: [], estimatedEngagement: 50 }
  }
}

// ============== 5. 跨模块推荐 ==============

export interface RecommendInput {
  userId: string
  recentViews: string[]  // productIds
  favorites: string[]
  purchases: string[]
  followedCategories: string[]
}

export interface RecommendItem {
  productId: string
  reason: 'browsing_history' | 'favorites' | 'similar' | 'trending' | 'high_rating' | 'friend_bought'
  score: number
}

export interface RecommendResult {
  items: RecommendItem[]
  explanation: string
}

/**
 * 纯本地实现,不调 AI - 节省 token
 * 算法：浏览加权 + 收藏加权 + 评分加权 + 趋势
 */
export async function recommend(input: RecommendInput, allProducts: Array<{ id: string; category: string; rating: number }>): Promise<RecommendResult> {
  const score = new Map<string, { s: number; r: Set<string> }>()
  const bump = (id: string, w: number, reason: string) => {
    const v = score.get(id) || { s: 0, r: new Set() }
    v.s += w
    v.r.add(reason)
    score.set(id, v)
  }
  // 浏览加权
  input.recentViews.forEach((id) => bump(id, 3, 'browsing_history'))
  // 收藏加权
  input.favorites.forEach((id) => bump(id, 5, 'favorites'))
  // 购买过的同分类加权
  input.purchases.forEach((pid) => {
    const cat = allProducts.find((p) => p.id === pid)?.category
    if (!cat) return
    allProducts.filter((p) => p.category === cat).forEach((p) => bump(p.id, 2, 'similar'))
  })
  // 关注分类加权
  input.followedCategories.forEach((c) => {
    allProducts.filter((p) => p.category === c).forEach((p) => bump(p.id, 1, 'trending'))
  })
  // 评分加权
  allProducts.filter((p) => p.rating >= 4.5).forEach((p) => bump(p.id, 1, 'high_rating'))

  const items: RecommendItem[] = Array.from(score.entries())
    .map(([id, v]) => ({
      productId: id,
      reason: Array.from(v.r)[0] as RecommendItem['reason'],
      score: v.s,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)

  return {
    items,
    explanation: `基于你的 ${input.recentViews.length} 次浏览、${input.favorites.length} 个收藏和关注分类推荐`,
  }
}
