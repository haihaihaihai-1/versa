import { useEffect, useState, useCallback, useMemo } from 'react'
import type { AppState, CartItem, Order, UserProfile, Activity, ModuleKey, AfterSalesRequest, ProductReview, AfterSalesType, UserCoupon, UserInvoice, UserAddress, ShortVideo, ShortVideoComment, ChatMessage, SupportTicket, PointsRecord, TaskItem, ProductQA } from '../data/types'

import { seedShortVideos, seedShortVideoComments } from '../data/shortVideos'
import { seedReviews } from '../data/reviews'
import { seedProductQAs } from '../data/productQAs'
import { seedFAQs, seedTickets, seedChatMessages, BOT_INTENTS } from '../data/support'
import { seedSignInDays, seedTasks, seedRewards } from '../data/member'
import { seedMessages } from '../data/messages'
import { seedBundles } from '../data/bundles'
import { seedUser } from '../data/users'
import { uid } from '../lib/utils'
const STORAGE_KEY = 'versa:state:v7'

const STATE_VERSION = 7

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
    reviews: seedReviews,
    productQAs: seedProductQAs,
    coupons: [
      { id: 'c1', name: '新人专享', amount: 30, threshold: 100, scope: 'all', expiresAt: '2099-12-31', description: '满 100 可用' },
      { id: 'c2', name: '数码专享', amount: 50, threshold: 500, scope: 'category', scopeValue: 'tech', expiresAt: '2099-12-31', description: '数码类满 500 可用' },
      { id: 'c3', name: '服饰立减', amount: 20, threshold: 0, scope: 'category', scopeValue: 'fashion', expiresAt: '2099-12-31', description: '服饰类无门槛' },
      { id: 'c4', name: '京东 PLUS', amount: 100, threshold: 1000, scope: 'all', expiresAt: '2099-12-31', description: '满 1000 可用' },
      { id: 'c5', name: '生日礼券', amount: 200, threshold: 500, scope: 'all', expiresAt: '2099-12-31', description: '生日月专享' },
    ],
    invoices: [
      { id: 'i1', type: 'personal', title: '许泉兴', email: 'quanxing@versa.com', isDefault: true },
    ],
    addresses: [
      { id: 'a1', name: '许泉兴', phone: '13800008829', province: '上海市', city: '徐汇区', district: '虹漕路', detail: '88 号 15 楼 1502 室', tag: 'home', isDefault: true },
      { id: 'a2', name: '许泉兴', phone: '13800008829', province: '上海市', city: '浦东新区', district: '世纪大道', detail: '100 号 3 号楼 28 楼', tag: 'work' },
    ],
    visitedModules: { news: 0, debate: 0, shop: 0 },
    joinedAt: new Date().toISOString(),
    shortVideos: seedShortVideos,
    shortVideoComments: seedShortVideoComments,
    followingCreators: ['u_creator_lila', 'u_creator_momo'],
    chatMessages: seedChatMessages,
    supportTickets: seedTickets,
    faqHelpful: seedFAQs.reduce<Record<string, number>>((acc, f) => ({ ...acc, [f.id]: f.helpful }), {}),
    pointsRecords: [
      { id: 'pr1', type: 'earn', source: 'order', title: '订单 #20260520 实付 ¥280', amount: 280, at: '2026-05-20T10:00:00Z' },
      { id: 'pr2', type: 'earn', source: 'review', title: '评价奖励 · 数码降噪耳机', amount: 50, at: '2026-05-22T15:00:00Z' },
      { id: 'pr3', type: 'earn', source: 'signin', title: '连续签到 3 天', amount: 60, at: '2026-05-25T08:00:00Z' },
      { id: 'pr4', type: 'spend', source: 'redeem', title: '兑换 ¥10 通用券', amount: -500, at: '2026-05-26T20:00:00Z' },
      { id: 'pr5', type: 'earn', source: 'order', title: '订单 #20260527 实付 ¥890', amount: 890, at: '2026-05-27T14:30:00Z' },
    ],
    signInDays: seedSignInDays,
    tasks: seedTasks,
    redeemedRewards: [],
    messages: seedMessages,
    bundles: seedBundles,
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
  setReducedMotion(v: boolean) {
    setState((s) => ({ ...s, preferences: { ...s.preferences, reducedMotion: v } }))
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

  appendReview(reviewId: string, content: string) {
    setState((s) => ({
      ...s,
      reviews: s.reviews.map((r) =>
        r.id === reviewId
          ? { ...r, append: { at: new Date().toISOString(), content } }
          : r
      ),
    }))
  },

  addReviewReply(reviewId: string, content: string, fromName: string, fromRole: 'seller' | 'user' | 'admin' = 'user') {
    setState((s) => ({
      ...s,
      reviews: s.reviews.map((r) => {
        if (r.id !== reviewId) return r
        const newReply: import('../data/types').ReviewReply = {
          id: uid('rp'),
          content,
          at: new Date().toISOString(),
          fromName,
          fromRole,
          isOfficial: fromRole === 'seller' || fromRole === 'admin',
        }
        return { ...r, replies: [...(r.replies || []), newReply] }
      }),
    }))
  },

  markReviewHelpful(reviewId: string) {
    setState((s) => ({
      ...s,
      reviews: s.reviews.map((r) =>
        r.id === reviewId ? { ...r, helpful: (r.helpful || 0) + 1 } : r
      ),
    }))
  },

  // product QAs
  askProductQuestion(productId: string, question: string, authorName: string) {
    const qa: ProductQA = {
      id: uid('qa'),
      productId,
      question,
      authorName,
      askedAt: new Date().toISOString(),
      helpful: 0,
    }
    setState((s) => ({ ...s, productQAs: [qa, ...s.productQAs] }))
    return qa
  },

  answerProductQuestion(qaId: string, answer: string, fromName: string, isOfficial = false) {
    setState((s) => ({
      ...s,
      productQAs: s.productQAs.map((q) =>
        q.id === qaId
          ? {
              ...q,
              answer,
              answeredBy: fromName,
              answerAt: new Date().toISOString(),
              answers: [
                ...(q.answers || []),
                {
                  id: uid('qar'),
                  content: answer,
                  at: new Date().toISOString(),
                  fromName,
                  isOfficial,
                },
              ],
            }
          : q
      ),
    }))
  },

  markQAHelpful(qaId: string) {
    setState((s) => ({
      ...s,
      productQAs: s.productQAs.map((q) =>
        q.id === qaId ? { ...q, helpful: q.helpful + 1 } : q
      ),
    }))
  },

  // addresses
  addAddress(addr: Omit<UserAddress, 'id'>) {
    setState((s) => {
      let list = s.addresses
      if (addr.isDefault) list = list.map((a) => ({ ...a, isDefault: false }))
      return { ...s, addresses: [...list, { ...addr, id: uid('addr') }] }
    })
  },
  updateAddress(id: string, patch: Partial<UserAddress>) {
    setState((s) => {
      let list = s.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a))
      if (patch.isDefault) list = list.map((a) => (a.id === id ? a : { ...a, isDefault: false }))
      return { ...s, addresses: list }
    })
  },
  deleteAddress(id: string) {
    setState((s) => ({ ...s, addresses: s.addresses.filter((a) => a.id !== id) }))
  },
  setDefaultAddress(id: string) {
    setState((s) => ({
      ...s,
      addresses: s.addresses.map((a) => ({ ...a, isDefault: a.id === id })),
    }))
  },

  // invoices
  addInvoice(inv: Omit<UserInvoice, 'id'>) {
    setState((s) => {
      let list = s.invoices
      if (inv.isDefault) list = list.map((i) => ({ ...i, isDefault: false }))
      return { ...s, invoices: [...list, { ...inv, id: uid('inv') }] }
    })
  },
  updateInvoice(id: string, patch: Partial<UserInvoice>) {
    setState((s) => {
      let list = s.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i))
      if (patch.isDefault) list = list.map((i) => ({ ...i, isDefault: i.id === id }))
      return { ...s, invoices: list }
    })
  },
  setDefaultInvoice(id: string) {
    setState((s) => ({
      ...s,
      invoices: s.invoices.map((i) => ({ ...i, isDefault: i.id === id })),
    }))
  },
  deleteInvoice(id: string) {
    setState((s) => ({ ...s, invoices: s.invoices.filter((i) => i.id !== id) }))
  },

  // coupons - mark used
  useCoupon(id: string) {
    setState((s) => ({ ...s, coupons: s.coupons.map((c) => (c.id === id ? { ...c, used: true } : c)) }))
  },

  // points & balance
  usePoints(amount: number) {
    setState((s) => ({ ...s, user: { ...s.user, points: Math.max(0, s.user.points - amount) } }))
  },
  useBalance(amount: number) {
    setState((s) => ({ ...s, user: { ...s.user, balance: Math.max(0, s.user.balance - amount) } }))
  },
  topUpBalance(amount: number) {
    setState((s) => ({ ...s, user: { ...s.user, balance: s.user.balance + amount } }))
  },

  // short videos
  likeShortVideo(id: string) {
    setState((s) => ({ ...s, shortVideos: s.shortVideos.map((v) => (v.id === id ? { ...v, likes: v.likes + 1 } : v)) }))
  },
  viewShortVideo(id: string) {
    setState((s) => ({ ...s, shortVideos: s.shortVideos.map((v) => (v.id === id ? { ...v, views: v.views + 1 } : v)) }))
  },
  addShortVideoComment(videoId: string, content: string) {
    setState((s) => {
      const c: ShortVideoComment = {
        id: uid('svc'),
        videoId,
        userId: s.user.id,
        userName: s.user.displayName,
        userAvatar: s.user.avatar,
        content,
        likes: 0,
        createdAt: new Date().toISOString(),
      }
      return {
        ...s,
        shortVideoComments: [c, ...s.shortVideoComments],
        shortVideos: s.shortVideos.map((v) => (v.id === videoId ? { ...v, comments: v.comments + 1 } : v)),
      }
    })
  },
  toggleFollowCreator(creatorId: string) {
    setState((s) => {
      const has = s.followingCreators.includes(creatorId)
      return { ...s, followingCreators: has ? s.followingCreators.filter((id) => id !== creatorId) : [...s.followingCreators, creatorId] }
    })
  },

  // support
  sendChatMessage(content: string) {
    setState((s) => {
      const now = new Date().toISOString()
      const userMsg: ChatMessage = { id: uid('cm'), role: 'user', content, at: now }
      // 智能助手自动回复
      const matched = BOT_INTENTS.find((b) => b.patterns.some((p) => content.includes(p)))
      const botMsg: ChatMessage = matched
        ? { id: uid('cm'), role: 'bot', content: matched.reply, intent: matched.intent, at: new Date(Date.now() + 800).toISOString() }
        : { id: uid('cm'), role: 'bot', content: '抱歉，我还在学习中。您可以换种说法，或转接人工客服。', at: new Date(Date.now() + 800).toISOString() }
      return { ...s, chatMessages: [...s.chatMessages, userMsg, botMsg] }
    })
  },
  clearChat() {
    setState((s) => ({ ...s, chatMessages: seedChatMessages }))
  },
  markFAQHelpful(id: string) {
    setState((s) => ({ ...s, faqHelpful: { ...s.faqHelpful, [id]: (s.faqHelpful[id] || 0) + 1 } }))
  },
  createTicket(title: string, category: string) {
    setState((s) => {
      const now = new Date().toISOString()
      const t: SupportTicket = {
        id: uid('t'),
        title,
        status: 'open',
        category,
        lastMessage: '工单已创建，等待客服接入...',
        messages: [
          { id: uid('tm'), role: 'system', content: '工单创建成功，预计 5 分钟内有人工客服接入', at: now },
        ],
        createdAt: now,
        updatedAt: now,
      }
      return { ...s, supportTickets: [t, ...s.supportTickets] }
    })
  },
  replyTicket(ticketId: string, content: string) {
    setState((s) => {
      const now = new Date().toISOString()
      return {
        ...s,
        supportTickets: s.supportTickets.map((t) => {
          if (t.id !== ticketId) return t
          const userMsg: ChatMessage = { id: uid('tm'), role: 'user', content, at: now }
          const agentMsg: ChatMessage = { id: uid('tm'), role: 'agent', content: '客服小王已收到，正在为您处理…', at: new Date(Date.now() + 2000).toISOString() }
          return {
            ...t,
            status: 'waiting',
            messages: [...t.messages, userMsg, agentMsg],
            lastMessage: agentMsg.content,
            updatedAt: now,
          }
        }),
      }
    })
  },
  closeTicket(ticketId: string) {
    setState((s) => ({
      ...s,
      supportTickets: s.supportTickets.map((t) => (t.id === ticketId ? { ...t, status: 'closed' as const, updatedAt: new Date().toISOString() } : t)),
    }))
  },

  // member center
  signIn() {
    setState((s) => {
      const dayIdx = s.signInDays.findIndex((d) => d.isToday)
      if (dayIdx < 0) return s
      const day = s.signInDays[dayIdx]
      if (day.status === 'done') return s
      const next = s.signInDays.map((d, i) => {
        if (i < dayIdx) return d
        if (i === dayIdx) return { ...d, status: 'done' as const }
        if (i === dayIdx + 1) return { ...d, status: 'today' as const, isToday: true }
        return { ...d, isToday: false }
      })
      const record: PointsRecord = {
        id: uid('pr'),
        type: 'earn',
        source: 'signin',
        title: `连续签到 ${dayIdx + 1} 天`,
        amount: day.points,
        at: new Date().toISOString(),
      }
      return {
        ...s,
        signInDays: next,
        user: { ...s.user, points: s.user.points + day.points },
        pointsRecords: [record, ...s.pointsRecords],
        tasks: s.tasks.map((t) => (t.id === 't_d1' ? { ...t, progress: 1, completed: true } : t)),
      }
    })
  },
  progressTask(taskId: string, amount = 1) {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => {
        if (t.id !== taskId) return t
        const progress = Math.min(t.target, t.progress + amount)
        return { ...t, progress, completed: progress >= t.target }
      }),
    }))
  },
  claimTask(taskId: string) {
    setState((s) => {
      const task = s.tasks.find((t) => t.id === taskId)
      if (!task || !task.completed || task.claimed) return s
      const record: PointsRecord = {
        id: uid('pr'),
        type: 'earn',
        source: 'task',
        title: `任务奖励 · ${task.name}`,
        amount: task.points,
        at: new Date().toISOString(),
      }
      return {
        ...s,
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, claimed: true } : t)),
        user: { ...s.user, points: s.user.points + task.points },
        pointsRecords: [record, ...s.pointsRecords],
      }
    })
  },
  addPoints(amount: number, title: string = '签到奖励') {
    setState((s) => {
      const record: PointsRecord = {
        id: uid('pr'),
        type: 'earn',
        source: 'signin',
        title,
        amount,
        at: new Date().toISOString(),
      }
      return {
        ...s,
        user: { ...s.user, points: s.user.points + amount },
        pointsRecords: [record, ...s.pointsRecords],
      }
    })
  },
  redeemReward(itemId: string) {
    setState((s) => {
      const item = seedRewards.find((r) => r.id === itemId)
      if (!item || s.redeemedRewards.includes(itemId) || s.user.points < item.cost) return s
      const record: PointsRecord = {
        id: uid('pr'),
        type: 'spend',
        source: 'redeem',
        title: `兑换 · ${item.name}`,
        amount: -item.cost,
        at: new Date().toISOString(),
      }
      return {
        ...s,
        redeemedRewards: [...s.redeemedRewards, itemId],
        user: { ...s.user, points: s.user.points - item.cost },
        pointsRecords: [record, ...s.pointsRecords],
      }
    })
  },

  // messages
  markMessageRead(id: string) {
    setState((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? { ...m, unread: false } : m)) }))
  },
  markAllMessagesRead(category?: string) {
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) => (category && m.category !== category ? m : { ...m, unread: false })),
    }))
  },
  deleteMessage(id: string) {
    setState((s) => ({ ...s, messages: s.messages.filter((m) => m.id !== id) }))
  },
  togglePinMessage(id: string) {
    setState((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)) }))
  },

  // bundles
  addBundleToCart(bundleId: string) {
    setState((s) => {
      const b = s.bundles.find((x) => x.id === bundleId)
      if (!b) return s
      const newCart = [...s.cart]
      b.products.forEach((p) => {
        const ex = newCart.find((c) => c.productId === p.productId)
        if (ex) ex.quantity += p.quantity
        else newCart.push({ productId: p.productId, quantity: p.quantity, addedAt: new Date().toISOString(), selected: true })
      })
      return { ...s, cart: newCart }
    })
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
