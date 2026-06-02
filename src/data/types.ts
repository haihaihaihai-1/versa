// ============== 三模块融合数据模型 ==============

export type ModuleKey = 'news' | 'debate' | 'shop'

export interface Author {
  id: string
  name: string
  handle: string
  avatar: string
  bio?: string
  verified?: boolean
  followers?: number
}

// ---------- News ----------
export type NewsCategory = 'tech' | 'finance' | 'culture' | 'science' | 'world' | 'lifestyle'

export interface NewsSection {
  heading: string
  anchor: string
}

export interface NewsArticle {
  id: string
  title: string
  subtitle: string
  cover: string
  category: NewsCategory
  author: Author
  publishedAt: string
  readTime: number
  content: string
  tags: string[]
  reactions: { like: number; insightful: number; disagree: number }
  views: number
  // Fusion links
  linkedDebateId?: string
  linkedProductIds?: string[]
  source?: string
  // Editorial
  isFeatured?: boolean
  isBreaking?: boolean
  isLongForm?: boolean
  wordCount?: number
  toc?: NewsSection[]
  relatedIds?: string[]
}

export interface BreakingNews {
  id: string
  title: string
  category: NewsCategory
  publishedAt: string
  linkId?: string
}

// ---------- Debate ----------
export type DebateCategory = 'tech' | 'social' | 'consumer' | 'philosophy' | 'entertainment' | 'world' | 'lifestyle'

export type DebateStatus = 'live' | 'upcoming' | 'ended'
export type DebateFormat = 'open' | 'roundtable' | 'oxford'

export interface Citation {
  id: string
  source: string
  url?: string
  quote: string
  author?: string
}

export interface Expert {
  id: string
  name: string
  avatar: string
  title: string
  bio: string
  stance: 'pro' | 'con' | 'neutral'
  credential: string
}

export interface DebateArgument {
  id: string
  side: 'pro' | 'con'
  authorId: string
  authorName: string
  authorAvatar: string
  content: string
  upvotes: number
  downvotes: number
  createdAt: string
  parentId?: string
  userVote?: 1 | -1 | 0
  // ProCon-style
  citations?: Citation[]
  isExpert?: boolean
  rebuttalOf?: string
  isFeatured?: boolean
}

export interface Debate {
  id: string
  title: string
  description: string
  category: DebateCategory
  creatorId: string
  createdAt: string
  pros: number
  cons: number
  arguments: DebateArgument[]
  views: number
  hot: number
  // Fusion links
  linkedNewsId?: string
  linkedProductId?: string
  cover?: string
  tags?: string[]
  // ProCon-style
  status?: DebateStatus
  format?: DebateFormat
  moderator?: Expert
  panelists?: Expert[]
  citations?: Citation[]
  relatedDebateIds?: string[]
  startAt?: string
  endAt?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  proStance?: string
  conStance?: string
}

// ---------- Shop ----------
export type ProductCategory = 'tech' | 'fashion' | 'home' | 'books' | 'food' | 'sports' | 'beauty'

export interface SkuOption {
  name: string
  values: { value: string; image?: string; available: boolean; priceDelta?: number }[]
}

export interface SkuSelection {
  [optionName: string]: string
}

export interface Coupon {
  id: string
  amount: number
  threshold: number
  description: string
  expiresAt: string
  claimed?: boolean
}

export interface Service {
  icon: string
  name: string
  description: string
}

export interface ShippingInfo {
  fee: number
  freeOver: number
  from: string
  estimatedDays: number
  express?: { fee: number; days: number }
}

export interface Review {
  id: string
  authorName: string
  authorAvatar: string
  rating: number
  content: string
  images: string[]
  sku: string
  createdAt: string
  helpful: number
  tags: string[]
  reply?: { from: string; content: string; createdAt: string }
}

export interface FlashSale {
  endsAt: string
  sold: number
  total: number
  flashPrice: number
}

export interface Product {
  id: string
  name: string
  tagline: string
  description: string
  price: number
  originalPrice?: number
  images: string[]
  brand: string
  category: ProductCategory
  rating: number
  reviewCount: number
  stock: number
  specs: Record<string, string>
  tags: string[]
  // Fusion links
  linkedDebateIds?: string[]
  linkedNewsId?: string
  isNewsworthy?: boolean
  vendor?: string
  // Taobao-style
  sales?: number
  detailImages?: string[]
  services?: Service[]
  shipping?: ShippingInfo
  coupons?: Coupon[]
  sku?: { options: SkuOption[]; images?: string[] }
  flashSale?: FlashSale
  reviews?: Review[]
  isFlagship?: boolean
  isExclusive?: boolean
  deliveryCity?: string
  // Brand hub
  brandLogo?: string
  brandStory?: string
}

// ---------- User ----------
export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  earnedAt: string
  module: ModuleKey | 'system'
}

export interface Activity {
  id: string
  type:
    | 'read_news'
    | 'vote_debate'
    | 'post_argument'
    | 'add_wishlist'
    | 'purchase'
    | 'earn_badge'
  module: ModuleKey
  refId: string
  refTitle: string
  createdAt: string
  points: number
}

export interface UserProfile {
  id: string
  username: string
  displayName: string
  avatar: string
  bio: string
  joinedAt: string
  reputation: number
  level: number
  badges: Badge[]
  points: number
  balance: number
  memberLevel: 'normal' | 'silver' | 'gold' | 'diamond'
  stats: {
    articlesRead: number
    debatesJoined: number
    argumentsPosted: number
    productsPurchased: number
  }
  activity: Activity[]
}

// ---------- App State ----------
export interface CartItem {
  productId: string
  quantity: number
  addedAt: string
  selected?: boolean
}

export type UserCoupon = {
  id: string
  name: string
  amount: number
  threshold: number
  scope: 'all' | 'category' | 'brand'
  scopeValue?: string
  expiresAt: string
  used?: boolean
  description?: string
}

export type UserInvoice = {
  id: string
  type: 'personal' | 'company'
  title: string
  taxId?: string
  email?: string
  isDefault?: boolean
}

export type UserAddress = {
  id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  tag?: 'home' | 'work' | 'school' | 'other'
  isDefault?: boolean
}

export type OrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'reviewing' | 'cancelled' | 'refunded'

export interface OrderTimelineEvent {
  status: OrderStatus
  label: string
  at?: string
  description?: string
}

export type AfterSalesType = 'refund_only' | 'return_refund' | 'exchange'
export type AfterSalesStatus = 'pending' | 'approved' | 'rejected' | 'refunded' | 'returned' | 'completed'

export interface AfterSalesRequest {
  id: string
  orderId: string
  productId: string
  type: AfterSalesType
  reason: string
  description?: string
  images?: string[]
  refundAmount?: number
  status: AfterSalesStatus
  createdAt: string
  timeline?: { at: string; label: string }[]
}

export interface ProductReview {
  id: string
  orderId: string
  productId: string
  rating: number
  content: string
  images?: string[]
  tags?: string[]
  anonymous?: boolean
  createdAt: string
  append?: { at: string; content: string }
  helpful?: number
}

export interface Order {
  id: string
  items: { productId: string; name: string; price: number; quantity: number; image: string }[]
  total: number
  status: OrderStatus
  placedAt: string
  address: string
  trackingNumber?: string
  carrier?: string
  paymentMethod?: 'wechat' | 'alipay' | 'huabei' | 'card'
  shippingMethod?: 'standard' | 'express' | 'jd'
  timeline?: OrderTimelineEvent[]
  afterSales?: AfterSalesRequest[]
  reviewed?: string[] // productIds that have been reviewed
}

export interface AppState {
  user: UserProfile
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: 'zh' | 'en'
    reducedMotion: boolean
  }
  cart: CartItem[]
  wishlist: string[]
  votedDebates: Record<string, 'pro' | 'con'>
  readArticles: Record<string, number> // id -> readPercent
  reactedArticles: Record<string, 'like' | 'insightful' | 'disagree'>
  orders: Order[]
  afterSales: AfterSalesRequest[]
  reviews: ProductReview[]
  coupons: UserCoupon[]
  invoices: UserInvoice[]
  addresses: UserAddress[]
  visitedModules: { news: number; debate: number; shop: number }
  joinedAt: string
  shortVideos: ShortVideo[]
  shortVideoComments: ShortVideoComment[]
  followingCreators: string[]
  chatMessages: ChatMessage[]
  supportTickets: SupportTicket[]
  faqHelpful: Record<string, number>
  pointsRecords: PointsRecord[]
  signInDays: SignInDay[]
  tasks: TaskItem[]
  redeemedRewards: string[]
  messages: AppMessage[]
  bundles: BundleItem[]
}

export type ScenarioKey = 'outdoor' | 'home' | 'office' | 'gift' | 'student' | 'fitness'

export interface Scenario {
  key: ScenarioKey
  name: string
  desc: string
  icon: string
  gradient: string
  productIds: string[]
  tip: string
}

export interface PricePoint {
  date: string
  price: number
}

export type BundleType = 'bundle' | 'addon' | 'gift'

export interface BundleItem {
  id: string
  name: string
  desc: string
  type: BundleType
  coverGradient: string
  products: { productId: string; quantity: number }[]
  bundlePrice: number
  originalPrice: number
  addonPrice?: number
  addonThreshold?: number
  badge?: string
  endsAt?: string
}

export type MessageCategory = 'shipping' | 'promo' | 'interact' | 'system'
export type MessageType = 'order_shipped' | 'order_delivered' | 'order_paid' | 'order_refunded' | 'coupon_received' | 'flash_sale' | 'price_drop' | 'member_upgrade' | 'comment_reply' | 'follow_post' | 'live_start' | 'system_announce' | 'security_alert' | 'task_reward'

export interface AppMessage {
  id: string
  category: MessageCategory
  type: MessageType
  title: string
  preview: string
  content: string
  icon: string
  gradient: string
  unread: boolean
  pinned: boolean
  link?: string
  meta?: { orderId?: string; amount?: number; productId?: string; creatorId?: string }
  at: string
}

export type ChatRole = 'user' | 'bot' | 'agent' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  intent?: string
  at: string
}

export type TicketStatus = 'open' | 'waiting' | 'resolved' | 'closed'

export interface SupportTicket {
  id: string
  title: string
  status: TicketStatus
  category: string
  lastMessage: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface FAQ {
  id: string
  category: 'order' | 'shipping' | 'payment' | 'refund' | 'member' | 'coupon' | 'account' | 'product'
  question: string
  answer: string
  helpful: number
}

export type ShortVideoCategory = 'food' | 'fashion' | 'tech' | 'beauty' | 'home' | 'travel' | 'fitness' | 'lifestyle'

export interface ShortVideo {
  id: string
  creatorId: string
  creatorName: string
  creatorAvatar: string
  creatorLevel: number
  cover: string
  coverGradient: string
  title: string
  description: string
  tags: string[]
  category: ShortVideoCategory
  productIds: string[]
  duration: number
  likes: number
  comments: number
  shares: number
  favorites: number
  views: number
  music: string
  isVideo: boolean
  location?: string
  createdAt: string
}

export interface ShortVideoComment {
  id: string
  videoId: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  likes: number
  createdAt: string
}

export type MemberLevel = 'normal' | 'silver' | 'gold' | 'diamond'

export interface MemberPrivilege {
  level: MemberLevel
  name: string
  threshold: number
  icon: string
  gradient: string
  benefits: string[]
  discount: number
  pointsRate: number
}

export type SignInStatus = 'done' | 'today' | 'missed' | 'future'

export interface SignInDay {
  day: number
  points: number
  status: SignInStatus
  isToday: boolean
  isReward: boolean
}

export type TaskType = 'daily' | 'achieve'

export interface TaskItem {
  id: string
  name: string
  desc: string
  type: TaskType
  icon: string
  gradient: string
  target: number
  progress: number
  points: number
  completed: boolean
  claimed: boolean
}

export type PointsSource = 'signin' | 'task' | 'order' | 'review' | 'comment' | 'redeem' | 'refund' | 'activity' | 'share'

export interface PointsRecord {
  id: string
  type: 'earn' | 'spend'
  source: PointsSource
  title: string
  amount: number
  at: string
}

export type RewardType = 'coupon' | 'product' | 'privilege' | 'gift'

export interface RewardItem {
  id: string
  name: string
  desc: string
  type: RewardType
  cost: number
  stock: number
  cover: string
  coverGradient: string
  badge?: string
}
