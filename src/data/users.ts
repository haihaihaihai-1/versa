import type { Badge, UserProfile, ModuleKey } from './types'
import { userNames, userAvatars } from './authors'

export const allBadges: Badge[] = [
  { id: 'b_early', name: '先行者', description: 'Versa 创始用户', icon: 'sparkles', earnedAt: '2026-01-01T00:00:00Z', module: 'system' },
  { id: 'b_news1', name: '资讯探索者', description: '读完 10 篇深度文章', icon: 'book-open', earnedAt: '', module: 'news' },
  { id: 'b_news2', name: '新闻评论员', description: '对资讯发表 5 次观点', icon: 'message-square', earnedAt: '', module: 'news' },
  { id: 'b_debate1', name: '观点表达者', description: '参与 3 场辩论', icon: 'mic', earnedAt: '', module: 'debate' },
  { id: 'b_debate2', name: '辩论大师', description: '在辩论中点赞过 100', icon: 'trophy', earnedAt: '', module: 'debate' },
  { id: 'b_shop1', name: '理性消费者', description: '加入 5 件商品到心愿单', icon: 'heart', earnedAt: '', module: 'shop' },
  { id: 'b_shop2', name: '消费先锋', description: '完成首次购买', icon: 'shopping-bag', earnedAt: '', module: 'shop' },
  { id: 'b_fusion', name: '三体贯通', description: '在三大模块都有活动', icon: 'infinity', earnedAt: '', module: 'system' },
  { id: 'b_veteran', name: '老用户', description: '加入 100 天', icon: 'crown', earnedAt: '', module: 'system' },
]

export const seedUser: UserProfile = {
  id: 'me',
  username: 'guest',
  displayName: 'Versa 访客',
  avatar: 'https://i.pravatar.cc/120?img=12',
  bio: '在 Versa 中探索购物、辩论、资讯的无限可能。',
  joinedAt: new Date().toISOString(),
  reputation: 0,
  level: 1,
  badges: [allBadges[0]],
  points: 1280,
  balance: 500,
  memberLevel: 'gold',
  stats: {
    articlesRead: 0,
    debatesJoined: 0,
    argumentsPosted: 0,
    productsPurchased: 0,
  },
  activity: [],
}

export function randomName(): string {
  return userNames[Math.floor(Math.random() * userNames.length)]
}

export function randomAvatar(): string {
  return userAvatars[Math.floor(Math.random() * userAvatars.length)]
}

export const moduleMeta: Record<ModuleKey, { name: string; nameEn: string; color: string; description: string; icon: string }> = {
  news: {
    name: '资讯',
    nameEn: 'News',
    color: '#f5a524',
    description: '深度新闻 · 事实核查 · 跨视角',
    icon: 'newspaper',
  },
  debate: {
    name: '辩论',
    nameEn: 'Debate',
    color: '#ef4f6b',
    description: '正反观点 · 理性交锋 · 共识构建',
    icon: 'scale',
  },
  shop: {
    name: '购物',
    nameEn: 'Shop',
    color: '#1ec28b',
    description: '精选商品 · 真实评价 · 理性决策',
    icon: 'shopping-bag',
  },
}
