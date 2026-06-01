// ============== 三模块融合数据模型 ==============

export type ModuleKey = 'news' | 'debate' | 'shop'

export interface Author {
  id: string
  name: string
  handle: string
  avatar: string
  bio?: string
  verified?: boolean
}

// ---------- News ----------
export type NewsCategory = 'tech' | 'finance' | 'culture' | 'science' | 'world' | 'lifestyle'

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
}

// ---------- Debate ----------
export type DebateCategory = 'tech' | 'social' | 'consumer' | 'philosophy' | 'entertainment' | 'world' | 'lifestyle'

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
}

// ---------- Shop ----------
export type ProductCategory = 'tech' | 'fashion' | 'home' | 'books' | 'food' | 'sports' | 'beauty'

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
}

export interface Order {
  id: string
  items: { productId: string; name: string; price: number; quantity: number; image: string }[]
  total: number
  status: 'paid' | 'shipped' | 'delivered' | 'cancelled'
  placedAt: string
  address: string
  trackingNumber?: string
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
  visitedModules: { news: number; debate: number; shop: number }
  joinedAt: string
}
