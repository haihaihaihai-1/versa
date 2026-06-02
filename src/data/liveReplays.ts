import type { Replay } from '../components/live/LiveReplay'
import { products } from '../data/products'

export const SAMPLE_REPLAYS: Replay[] = [
  {
    id: 'r1',
    title: '618 数码狂欢夜 · 完整回放',
    host: { name: '数码小仙女', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=techgirl', title: 'Versa 数码官方', followers: 1280000 },
    cover: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1200&q=80',
    duration: 3725,
    recordedAt: Date.now() - 86400000,
    views: 234567,
    productIds: products.filter((p) => p.category === 'tech').slice(0, 4).map((p) => p.id),
    tags: ['数码', 'iPhone', '回放'],
    category: 'tech',
    description: '本次直播全场 iPhone 15 直降 1500,加赠 200 元配件券,直播间下单还可参与抽奖。',
    highlights: [
      { at: 45, label: '🎁 抽奖环节: AirPods Pro' },
      { at: 320, label: '💰 iPhone 15 优惠公布' },
      { at: 1280, label: '🔥 MacBook Air M3 上架' },
      { at: 2400, label: '🎉 直播间专享 8 折' },
      { at: 3300, label: '👋 直播结束 · 下次再见' },
    ],
    comments: [
      { user: '小明', text: '主播专业!', at: 23 },
      { user: '小红', text: '下单了!', at: 156 },
      { user: '土豪小张', text: 'iPhone 真香', at: 480 },
      { user: '追剧达人', text: '有没有笔记本?', at: 1024 },
      { user: '美食家老王', text: '直播间福利太好了', at: 2100 },
    ],
  },
  {
    id: 'r2',
    title: '美妆直播 · SK-II 神仙水专场',
    host: { name: '美妆博主林林', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=beauty', title: '资深美妆达人', followers: 856000 },
    cover: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80',
    duration: 2950,
    recordedAt: Date.now() - 86400000 * 3,
    views: 89432,
    productIds: products.filter((p) => p.category === 'beauty').slice(0, 3).map((p) => p.id),
    tags: ['美妆', '护肤'],
    category: 'beauty',
    description: 'SK-II 神仙水深度测评,买一送十,仅限直播。',
    highlights: [
      { at: 120, label: '🧴 神仙水成分解析' },
      { at: 800, label: '✨ 使用前后对比' },
      { at: 1800, label: '🎁 买一送十 优惠' },
    ],
    comments: [
      { user: '小美爱买', text: 'SK-II 永远的神', at: 200 },
      { user: '设计师Lily', text: '想入坑', at: 850 },
    ],
  },
]
