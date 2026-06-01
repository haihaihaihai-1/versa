import { useEffect, useState, useCallback, useMemo } from 'react'
import type { AppState, CartItem, Order, UserProfile, Activity, ModuleKey, AfterSalesRequest, ProductReview, AfterSalesType } from '../data/types'
import { seedUser } from '../data/users'
import { uid } from '../lib/utils'

const STORAGE_KEY = 'versa:state:v1'
const STATE_VERSION = 1

const POINTS = {
  READ_ARTICLE: 5,
  REACT_ARTICLE: 3,
  VOTE_DEBATE: 8,
  POST_ARGUMENT: 15,
  ADD_WISHLIST: 2,
  PURCHASE: 30,
  VISIT_MODULE: 1,
}

function defaultState(): AppState {
  return {
    user: { ...seedUser, joinedAt: new Date().toISOString() },
    preferences: {
      theme: 'system',
      language: 'zh',
      reducedMotion: false,
    },
    cart: [],
    wishlist: [],
    votedDebates: {},
    readArticles: {},
    reactedArticles: {},
    orders: [],
    afterSales: [],
    reviews: [],
    visitedModules: { news: 0, debate: 0, shop: 0 },
    joinedAt: new Date().toISOString(),
  }
}

function loadState(): AppState {
  if (typeof window === 'undefined') return defaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as { version: number; data: AppState }
    if (parsed.version !== STATE_VERSION) return defaultState()
    return { ...defaultState(), ...parsed.data, user: { ...seedUser, ...parsed.data.user } }
  } catch {
    return defaultState()
  }
}

function saveState(s: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STATE_VERSION, data: s }))
  } catch (e) {
    console.warn('Failed to save Versa state', e)
  }
}

// Reputation → level
export function levelFor(rep: number): number {
  if (rep < 50) return 1
  if (rep < 200) return 2
  if (rep < 500) return 3
  if (rep < 1200) return 4
  if (rep < 3000) return 5
  if (rep < 8000) return 6
  if (rep < 20000) return 7
  return 8
}

export function levelTitle(level: number): string {
  return ['', '初探者', '浏览者', '参与者', '贡献者', '行家', '鉴赏家', '思想家', '贤者'][level] || '贤者'
}

export function levelProgress(rep: number): { current: number; next: number; percent: number } {
  const thresholds = [0, 50, 200, 500, 1200, 3000, 8000, 20000, 50000]
  const level = levelFor(rep)
  const current = thresholds[level - 1]
  const next = thresholds[level] ?? thresholds[thresholds.length - 1]
  const percent = next === current ? 100 : Math.min(100, Math.max(0, ((rep - current) / (next - current)) * 100))
  return { current: rep - current, next: next - current, percent }
}

function addActivity(s: AppState, a: Omit<Activity, 'id' | 'createdAt'>): AppState {
  const activity: Activity = { ...a, id: uid('act'), createdAt: new Date().toISOString() }
  const user: UserProfile = {
    ...s.user,
    reputation: s.user.reputation + a.points,
    level: levelFor(s.user.reputation + a.points),
    activity: [activity, ...s.user.activity].slice(0, 50),
  }
  return { ...s, user }
}

type Listener = (s: AppState) => void
const listeners = new Set<Listener>()
let _state: AppState | null = null
let _initialized = false

function getState(): AppState {
  if (!_initialized) {
    _state = loadState()
    _initialized = true
  }
  return _state!
}

function setState(updater: (s: AppState) => AppState) {
  _state = updater(getState())
  saveState(_state)
  listeners.forEach((l) => l(_state!))
}

function subscribe(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useVersa(): AppState {
  const [s, setS] = useState<AppState>(getState)
  useEffect(() => subscribe(setS), [])
  return s
}

export const versa = {
  get: getState,
  set: setState,
  subscribe,

  // preferences
  setTheme(theme: 'light' | 'dark' | 'system') {
    setState((s) => ({ ...s, preferences: { ...s.preferences, theme } }))
  },
  setLanguage(lang: 'zh' | 'en') {
    setState((s) => ({ ...s, preferences: { ...s.preferences, language: lang } }))
  },

  // profile
  updateProfile(patch: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'avatar'>>) {
    setState((s) => ({ ...s, user: { ...s.user, ...patch } }))
  },

  // module visit
  visitModule(m: ModuleKey) {
    setState((s) => addActivity(
      { ...s, visitedModules: { ...s.visitedModules, [m]: s.visitedModules[m] + 1 } },
      { type: 'vote_debate' as any, module: m, refId: m, refTitle: `浏览了${m === 'news' ? '资讯' : m === 'debate' ? '辩论' : '购物'}`, points: POINTS.VISIT_MODULE }
    ))
  },

  // news
  trackRead(newsId: string, percent: number) {
    setState((s) => {
      const prev = s.readArticles[newsId] || 0
      if (prev >= percent) return s
      const next = { ...s.readArticles, [newsId]: percent }
      let user = s.user
      // Award points when first reaching 80%
      if (prev < 80 && percent >= 80) {
        const activity: Activity = {
          id: uid('act'),
          type: 'read_news',
          module: 'news',
          refId: newsId,
          refTitle: '读完一篇深度文章',
          createdAt: new Date().toISOString(),
          points: POINTS.READ_ARTICLE,
        }
        user = {
          ...user,
          reputation: user.reputation + POINTS.READ_ARTICLE,
          level: levelFor(user.reputation + POINTS.READ_ARTICLE),
          stats: { ...user.stats, articlesRead: user.stats.articlesRead + 1 },
          activity: [activity, ...user.activity].slice(0, 50),
        }
      }
      return { ...s, readArticles: next, user }
    })
  },
  reactArticle(newsId: string, reaction: 'like' | 'insightful' | 'disagree') {
    setState((s) => {
      const prev = s.reactedArticles[newsId]
      if (prev === reaction) {
        const { [newsId]: _, ...rest } = s.reactedArticles
        return { ...s, reactedArticles: rest }
      }
      return addActivity(
        { ...s, reactedArticles: { ...s.reactedArticles, [newsId]: reaction } },
        { type: 'read_news', module: 'news', refId: newsId, refTitle: `对资讯表达态度：${reaction}`, points: POINTS.REACT_ARTICLE }
      )
    })
  },

  // debate
  voteDebate(debateId: string, side: 'pro' | 'con') {
    setState((s) => {
      const prev = s.votedDebates[debateId]
      if (prev === side) {
        const { [debateId]: _, ...rest } = s.votedDebates
        return { ...s, votedDebates: rest, user: s.user }
      }
      return addActivity(
        { ...s, votedDebates: { ...s.votedDebates, [debateId]: side }, user: { ...s.user, stats: { ...s.user.stats, debatesJoined: prev ? s.user.stats.debatesJoined : s.user.stats.debatesJoined + 1 } } },
        { type: 'vote_debate', module: 'debate', refId: debateId, refTitle: side === 'pro' ? '投了正方一票' : '投了反方一票', points: POINTS.VOTE_DEBATE }
      )
    })
  },
  postArgument(debateId: string, side: 'pro' | 'con', content: string) {
    setState((s) => addActivity(
      { ...s, user: { ...s.user, stats: { ...s.user.stats, argumentsPosted: s.user.stats.argumentsPosted + 1 } } },
      { type: 'post_argument', module: 'debate', refId: debateId, refTitle: `在辩论中发表了${side === 'pro' ? '正方' : '反方'}观点`, points: POINTS.POST_ARGUMENT }
    ))
  },
  voteArgument(argId: string, value: 1 | -1) {
    setState((s) => s)
  },

  // wishlist
  toggleWishlist(productId: string) {
    setState((s) => {
      const exists = s.wishlist.includes(productId)
      if (exists) return { ...s, wishlist: s.wishlist.filter((id) => id !== productId) }
      return addActivity(
        { ...s, wishlist: [...s.wishlist, productId] },
        { type: 'add_wishlist', module: 'shop', refId: productId, refTitle: '收藏了一件商品', points: POINTS.ADD_WISHLIST }
      )
    })
  },

  // cart
  addToCart(productId: string, qty = 1) {
    setState((s) => {
      const existing = s.cart.find((c) => c.productId === productId)
      if (existing) {
        return {
          ...s,
          cart: s.cart.map((c) => (c.productId === productId ? { ...c, quantity: c.quantity + qty } : c)),
        }
      }
      const item: CartItem = { productId, quantity: qty, addedAt: new Date().toISOString() }
      return { ...s, cart: [...s.cart, item] }
    })
  },
  updateCartQuantity(productId: string, qty: number) {
    setState((s) => {
      if (qty <= 0) return { ...s, cart: s.cart.filter((c) => c.productId !== productId) }
      return { ...s, cart: s.cart.map((c) => (c.productId === productId ? { ...c, quantity: qty } : c)) }
    })
  },
  removeFromCart(productId: string) {
    setState((s) => ({ ...s, cart: s.cart.filter((c) => c.productId !== productId) }))
  },
  clearCart() {
    setState((s) => ({ ...s, cart: [] }))
  },

  // orders
  placeOrder(
    items: { productId: string; name: string; price: number; quantity: number; image: string }[],
    total: number,
    address: string,
    extras?: { paymentMethod?: Order['paymentMethod']; shippingMethod?: Order['shippingMethod'] }
  ): Order {
    const now = new Date().toISOString()
    const order: Order = {
      id: uid('ord'),
      items,
      total,
      status: 'paid',
      placedAt: now,
      address,
      trackingNumber: 'SF' + Math.random().toString(36).slice(2, 10).toUpperCase(),
      paymentMethod: extras?.paymentMethod,
      shippingMethod: extras?.shippingMethod,
      carrier: '顺丰快递',
      timeline: [
        { status: 'pending_payment', label: '待付款', description: '订单已创建' },
        { status: 'paid', label: '已支付', at: now, description: '支付成功，商家将尽快发货' },
        { status: 'shipped', label: '已发货', description: '预计 1-2 天内送达' },
        { status: 'delivered', label: '已签收', description: '点击确认收货' },
        { status: 'reviewing', label: '已评价', description: '完成订单' },
      ],
    }
    setState((s) =>
      addActivity(
        {
          ...s,
          cart: [],
          orders: [order, ...s.orders],
          user: { ...s.user, stats: { ...s.user.stats, productsPurchased: s.user.stats.productsPurchased + 1 } },
        },
        { type: 'purchase', module: 'shop', refId: order.id, refTitle: `完成了一笔订单 (¥${total})`, points: POINTS.PURCHASE }
      )
    )
    return order
  },

  // confirm receipt
  confirmReceipt(orderId: string) {
    setState((s) => {
      const order = s.orders.find((o) => o.id === orderId)
      if (!order) return s
      const now = new Date().toISOString()
      const updatedOrders = s.orders.map((o) => {
        if (o.id !== orderId) return o
        return {
          ...o,
          status: 'delivered' as const,
          timeline: (o.timeline || []).map((t) => (t.status === 'delivered' ? { ...t, at: now } : t)),
        }
      })
      return { ...s, orders: updatedOrders }
    })
  },

  // cancel order
  cancelOrder(orderId: string) {
    setState((s) => {
      const now = new Date().toISOString()
      return {
        ...s,
        orders: s.orders.map((o) => {
          if (o.id !== orderId) return o
          return {
            ...o,
            status: 'cancelled' as const,
            timeline: [
              ...(o.timeline || []),
              { status: 'cancelled' as const, label: '已取消', at: now, description: '用户主动取消订单' },
            ],
          }
        }),
      }
    })
  },

  // after sales
  applyAfterSales(req: Omit<AfterSalesRequest, 'id' | 'createdAt' | 'status' | 'timeline'>) {
    const id = uid('as')
    const now = new Date().toISOString()
    const request: AfterSalesRequest = {
      ...req,
      id,
      status: 'pending',
      createdAt: now,
      timeline: [
        { at: now, label: '售后申请已提交' },
        { at: new Date(Date.now() + 3600_000).toISOString(), label: '商家审核中' },
        { at: new Date(Date.now() + 86400_000).toISOString(), label: '审核结果通知' },
      ],
    }
    setState((s) => {
      const updatedOrders = s.orders.map((o) =>
        o.id === req.orderId ? { ...o, afterSales: [...(o.afterSales || []), request] } : o
      )
      return { ...s, afterSales: [request, ...s.afterSales], orders: updatedOrders }
    })
    return request
  },

  // reviews
  addReview(review: Omit<ProductReview, 'id' | 'createdAt' | 'helpful'>) {
    const id = uid('rv')
    const now = new Date().toISOString()
    const r: ProductReview = { ...review, id, createdAt: now, helpful: 0 }
    setState((s) => {
      const updatedOrders = s.orders.map((o) =>
        o.id === review.orderId ? { ...o, reviewed: [...(o.reviewed || []), review.productId] } : o
      )
      return { ...s, reviews: [r, ...s.reviews], orders: updatedOrders }
    })
    return r
  },

  // reset
  reset() {
    _state = defaultState()
    saveState(_state)
    listeners.forEach((l) => l(_state!))
  },
}

// Hook helpers
export function useCartTotals() {
  const s = useVersa()
  const cartCount = s.cart.reduce((a, c) => a + c.quantity, 0)
  const wishlistCount = s.wishlist.length
  return useMemo(() => ({ cartCount, wishlistCount }), [cartCount, wishlistCount])
}
