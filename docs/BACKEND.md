# Versa · 后端对接指南

> 这份文档说明如何把 Versa 从纯前端 (localStorage) 模式切换到完整后端模式。

## 1. 当前架构

```
┌────────────────────────────────────┐
│           React Frontend           │
│  ┌──────────┐  ┌──────────────┐    │
│  │ Pages    │←→│  versa.ts    │    │
│  │ (15 个)  │  │  (Store)     │    │
│  └──────────┘  └──────┬───────┘    │
│                       │            │
│                  localStorage      │
│                  (浏览器本地)      │
└────────────────────────────────────┘
```

数据流：用户操作 → Store Action → 更新内存 state → 自动写入 localStorage → 监听器通知 UI 重渲染

## 2. 推荐后端选型

| 场景 | 推荐 | 原因 |
|---|---|---|
| 个人/小团队 | PocketBase | 单文件 Go 后端，30 秒启动 |
| 中型项目 | Supabase | PostgreSQL + Auth + Realtime |
| 定制化 | Node.js + Fastify + PostgreSQL | 灵活 |
| 已有基础设施 | Firebase | 实时同步好 |

## 3. 切换步骤

### 3.1 抽出 API 层

新建 `src/api/versa.ts`：

```ts
// 把 store/versa.ts 里的 localStorage 操作替换为 fetch 调用
export const api = {
  // 用户
  getMe: () => fetch('/api/me').then(r => r.json()),
  updateProfile: (p) => fetch('/api/me', { method: 'PATCH', body: JSON.stringify(p) }).then(r => r.json()),

  // 资讯
  listNews: (params) => fetch(`/api/news?${new URLSearchParams(params)}`).then(r => r.json()),
  trackRead: (id, pct) => fetch(`/api/news/${id}/read`, { method: 'POST', body: JSON.stringify({ pct }) }),
  reactArticle: (id, r) => fetch(`/api/news/${id}/react`, { method: 'POST', body: JSON.stringify({ r }) }),

  // 辩论
  listDebates: (params) => fetch(`/api/debates?${new URLSearchParams(params)}`).then(r => r.json()),
  voteDebate: (id, side) => fetch(`/api/debates/${id}/vote`, { method: 'POST', body: JSON.stringify({ side }) }),
  postArgument: (id, side, content) => fetch(`/api/debates/${id}/arguments`, { method: 'POST', body: JSON.stringify({ side, content }) }),

  // 商品
  listProducts: (params) => fetch(`/api/products?${new URLSearchParams(params)}`).then(r => r.json()),
  addToCart: (id, qty) => fetch('/api/cart', { method: 'POST', body: JSON.stringify({ id, qty }) }),
  placeOrder: (data) => fetch('/api/orders', { method: 'POST', body: JSON.stringify(data) }),

  // 收藏
  toggleWishlist: (id) => fetch(`/api/wishlist/${id}`, { method: 'POST' }),
}
```

### 3.2 改造 store/versa.ts

把 `set` 函数里的 `saveState` 改为调用 api：

```ts
function setState(updater: (s: AppState) => AppState) {
  _state = updater(getState())
  // 移除: saveState(_state)
  listeners.forEach((l) => l(_state!))
}

// 把直接调用 versa.addToCart 等的副作用操作改为先更新本地再异步同步
addToCart(productId: string, qty = 1) {
  setState((s) => {
    // 乐观更新本地
    const existing = s.cart.find((c) => c.productId === productId)
    if (existing) return { ...s, cart: s.cart.map((c) => c.productId === productId ? { ...c, quantity: c.quantity + qty } : c) }
    return { ...s, cart: [...s.cart, { productId, quantity: qty, addedAt: new Date().toISOString() }] }
  })
  // 异步同步
  api.addToCart(productId, qty).catch(console.error)
}
```

### 3.3 数据模型 → 数据库表

```sql
-- 用户
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar TEXT,
  bio TEXT,
  reputation INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 资讯
CREATE TABLE news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  cover TEXT,
  category TEXT,
  content TEXT,
  author_id TEXT REFERENCES authors(id),
  published_at TIMESTAMPTZ,
  views INT DEFAULT 0,
  linked_debate_id TEXT REFERENCES debates(id),
  linked_product_ids TEXT[]
);

-- 辩论
CREATE TABLE debates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  creator_id UUID REFERENCES users(id),
  pros INT DEFAULT 0,
  cons INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  linked_news_id TEXT REFERENCES news(id),
  linked_product_id TEXT REFERENCES products(id)
);

CREATE TABLE debate_arguments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id TEXT REFERENCES debates(id),
  side TEXT CHECK (side IN ('pro', 'con')),
  author_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  parent_id UUID REFERENCES debate_arguments(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 商品
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  original_price NUMERIC(10,2),
  images TEXT[],
  brand TEXT,
  category TEXT,
  rating NUMERIC(2,1),
  stock INT,
  specs JSONB,
  linked_debate_ids TEXT[],
  linked_news_id TEXT
);

-- 订单
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  items JSONB NOT NULL,
  total NUMERIC(10,2),
  status TEXT,
  address TEXT,
  tracking_number TEXT,
  placed_at TIMESTAMPTZ DEFAULT now()
);

-- 用户活动
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT,
  module TEXT,
  ref_id TEXT,
  points INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 实时辩论（WebSocket）

辩论的投票/新观点建议使用 Supabase Realtime 或自建 WebSocket：

```ts
// 订阅辩论房间
supabase
  .channel(`debate:${debateId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'debate_arguments', filter: `debate_id=eq.${debateId}` },
    (payload) => addNewArgument(payload.new)
  )
  .subscribe()
```

## 4. 支付集成

把 `src/pages/CheckoutPage.tsx` 的 `handlePlace` 改为：

```ts
const handlePlace = async () => {
  // 1. 创建订单
  const order = await api.placeOrder({ items, address, total })
  // 2. 调起支付
  const payment = await fetch('/api/payment/create', {
    method: 'POST',
    body: JSON.stringify({ orderId: order.id, amount: total, method: 'wechat' })
  }).then(r => r.json())
  // 3. 跳转支付
  if (payment.qrcode) {
    // 显示二维码
  } else if (payment.redirectUrl) {
    window.location.href = payment.redirectUrl
  }
}
```

支付回调处理：

```ts
// pages/CheckoutSuccessPage.tsx
useEffect(() => {
  // 轮询订单状态
  const timer = setInterval(async () => {
    const order = await api.getOrder(orderId)
    if (order.status === 'paid') {
      clearInterval(timer)
      // 显示成功
    }
  }, 2000)
  return () => clearInterval(timer)
}, [orderId])
```

## 5. 鉴权

接入 Auth0 / Supabase Auth / Clerk：

```tsx
// 在 Layout 外层包一层
<AuthProvider>
  <Layout />
</AuthProvider>

// useAuth hook
function useAuth() {
  const [user, setUser] = useState(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null))
  }, [])
  return { user, signOut: () => supabase.auth.signOut() }
}
```

## 6. 性能优化

- 用 `React.lazy` 切分页面代码
- 用 TanStack Query 做数据缓存
- 静态资源（图片）走 CDN
- 辩论列表用 `useInfiniteQuery` 滚动加载
- Service Worker 做离线访问

## 7. 安全

- 鉴权：JWT + HTTP-only cookies
- 防滥用：rate-limit（每 IP 每分钟 60 次）
- 内容审核：接入第三方 API（阿里云内容安全、AWS Comprehend）
- 用户输入：XSS 过滤（DOMPurify）、SQL 注入（参数化查询）
- 支付：服务端验签

## 8. 监控

- Sentry：前端错误
- LogRocket：用户行为回放
- Prometheus + Grafana：服务端指标
- Plausible：流量分析

---

迁移到完整后端约需 2-4 周单人工作量，主要是写 API + 改 store + 接支付 + 鉴权。架构已经为此设计好，迁移成本可控。
