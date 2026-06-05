/**
 * Versa · 推荐系统 (v16.0)
 *
 * 策略：
 * 1. 基于兴趣标签的内容推荐 (Jaccard 相似度)
 * 2. 协同过滤 (user-item 矩阵 → 余弦相似度)
 * 3. 热门衰减 (时间半衰期)
 * 4. 多样性重排 (MMR)
 */

export interface Item {
  id: string
  title: string
  tags: string[]
  category?: string
  authorId?: string
  createdAt: number
  views?: number
  likes?: number
}

export interface UserProfile {
  id: string
  interests: string[]   // 标签集合
  history: string[]     // 已读/已购/已赞 item id
  followedAuthors?: string[]
}

export interface Recommendation {
  item: Item
  score: number
  reason: string
}

const HALF_LIFE_HOURS = 48

function timeDecay(createdAt: number, now = Date.now()): number {
  const ageHours = (now - createdAt) / (1000 * 60 * 60)
  return Math.pow(0.5, ageHours / HALF_LIFE_HOURS)
}

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0
  let intersection = 0
  for (const x of a) if (b.has(x)) intersection++
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (const [k, v] of a) {
    dot += v * (b.get(k) || 0)
    na += v * v
  }
  for (const v of b.values()) nb += v * v
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

class Recommender {
  private items: Map<string, Item> = new Map()
  private userItemMatrix: Map<string, Map<string, number>> = new Map()  // userId -> (itemId -> score)

  addItem(item: Item): void {
    this.items.set(item.id, item)
  }

  addItems(items: Item[]): void {
    for (const i of items) this.addItem(i)
  }

  /** 记录用户对物品的隐式反馈 */
  recordInteraction(userId: string, itemId: string, weight = 1): void {
    if (!this.userItemMatrix.has(userId)) this.userItemMatrix.set(userId, new Map())
    const m = this.userItemMatrix.get(userId)!
    m.set(itemId, (m.get(itemId) || 0) + weight)
  }

  /** 基于兴趣标签 + 时间衰减 + 热度 */
  recommendByInterest(profile: UserProfile, limit = 10): Recommendation[] {
    const interests = new Set(profile.interests)
    const seen = new Set(profile.history)
    const now = Date.now()
    const recs: Recommendation[] = []
    for (const item of this.items.values()) {
      if (seen.has(item.id)) continue
      const itemTags = new Set(item.tags)
      const sim = jaccard(interests, itemTags)
      if (sim === 0) continue
      const decay = timeDecay(item.createdAt, now)
      const pop = Math.log10(1 + (item.views || 0) + (item.likes || 0) * 5)
      const score = sim * 0.6 + decay * 0.3 + pop * 0.1
      recs.push({ item, score, reason: `兴趣匹配 ${(sim * 100).toFixed(0)}%` })
    }
    recs.sort((a, b) => b.score - a.score)
    return recs.slice(0, limit)
  }

  /** 协同过滤: 找相似用户 → 取他们喜欢的物品 */
  recommendByCollaborative(userId: string, limit = 10): Recommendation[] {
    const myVec = this.userItemMatrix.get(userId)
    if (!myVec) return []
    const seen = new Set(myVec.keys())
    const sims: Array<{ userId: string; sim: number }> = []
    for (const [otherId, vec] of this.userItemMatrix) {
      if (otherId === userId) continue
      const sim = cosine(myVec, vec)
      if (sim > 0) sims.push({ userId: otherId, sim })
    }
    sims.sort((a, b) => b.sim - a.sim)
    const topK = sims.slice(0, 20)
    const scores: Map<string, { score: number; supporters: number }> = new Map()
    for (const { userId: otherId, sim } of topK) {
      const vec = this.userItemMatrix.get(otherId)!
      for (const [itemId, w] of vec) {
        if (seen.has(itemId)) continue
        const cur = scores.get(itemId) || { score: 0, supporters: 0 }
        cur.score += sim * w
        cur.supporters += 1
        scores.set(itemId, cur)
      }
    }
    const recs: Recommendation[] = []
    for (const [itemId, { score, supporters }] of scores) {
      const item = this.items.get(itemId)
      if (!item) continue
      recs.push({
        item,
        score,
        reason: `${supporters} 个相似用户也喜欢`,
      })
    }
    recs.sort((a, b) => b.score - a.score)
    return recs.slice(0, limit)
  }

  /** 热门: 时间衰减 + 互动量 */
  trending(limit = 10): Recommendation[] {
    const now = Date.now()
    const recs: Recommendation[] = []
    for (const item of this.items.values()) {
      const decay = timeDecay(item.createdAt, now)
      const pop = (item.views || 0) + (item.likes || 0) * 5
      const score = pop * decay
      if (score === 0) continue
      recs.push({ item, score, reason: `🔥 热度 ${pop.toFixed(0)}` })
    }
    recs.sort((a, b) => b.score - a.score)
    return recs.slice(0, limit)
  }

  /** 综合: 兴趣 0.5 + 协同 0.3 + 热门 0.2 */
  recommend(profile: UserProfile, limit = 10): Recommendation[] {
    const byInterest = this.recommendByInterest(profile, limit * 3)
    const byCollab = this.recommendByCollaborative(profile.id, limit * 3)
    const trending = this.trending(limit * 2)
    const combined: Map<string, Recommendation> = new Map()
    const addScore = (id: string, rec: Recommendation, weight: number) => {
      const existing = combined.get(id)
      if (existing) {
        existing.score += rec.score * weight
        existing.reason = `${existing.reason} + ${rec.reason}`
      } else {
        combined.set(id, { ...rec, score: rec.score * weight, reason: rec.reason })
      }
    }
    for (const r of byInterest) addScore(r.item.id, r, 0.5)
    for (const r of byCollab) addScore(r.item.id, r, 0.3)
    for (const r of trending) addScore(r.item.id, r, 0.2)
    const merged = Array.from(combined.values()).sort((a, b) => b.score - a.score)
    return this.mmrRerank(merged, limit)
  }

  /** 最大边际相关性: 兼顾相关性与多样性 */
  private mmrRerank(recs: Recommendation[], limit: number, lambda = 0.7): Recommendation[] {
    const result: Recommendation[] = []
    const pool = [...recs]
    while (result.length < limit && pool.length > 0) {
      let bestIdx = 0
      let bestScore = -Infinity
      for (let i = 0; i < pool.length; i++) {
        const cand = pool[i]
        const maxSim = result.length === 0
          ? 0
          : Math.max(...result.map((r) => jaccard(new Set(r.item.tags), new Set(cand.item.tags))))
        const mmr = lambda * cand.score - (1 - lambda) * maxSim
        if (mmr > bestScore) {
          bestScore = mmr
          bestIdx = i
        }
      }
      result.push(pool.splice(bestIdx, 1)[0])
    }
    return result
  }
}

export const recommender = new Recommender()
export { Recommender, jaccard, cosine, timeDecay }
