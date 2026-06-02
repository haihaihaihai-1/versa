# Versa · 三体融合平台

> 在 Versa，**新闻激发辩论，辩论推荐商品，商品成为新闻**。

一个把 **购物 · 辩论 · 资讯** 三体融合的 React SPA，全部数据 localStorage 持久化（兼容 PocketBase API）。

🔗 在线: <https://haihaihaihai-1.github.io/versa/>

## ✨ 核心特性

### 4 大功能体 (50+ 页面)
- **🛍️ 购物** — 12 件商品 · 购物车 · 结算 · 订单/售后/评价 · 短视频种草 · 直播 · 品牌街 · 优惠券 · 闪购秒杀 · 凑单套餐 · 选品助手
- **⚖️ 辩论** — 8 场辩论 · 圆桌论坛 · PRO vs CON · 实时投票 · 创作者入驻
- **📰 资讯** — 10 篇新闻 · 5 大分类 · 阅读进度跟踪 · 推荐流
- **👥 社区** — 群组 · 关注 · 私信 · 通知 · 创作者主页 v2 · 24h Stories

### 🆕 v8-v9 阶段 (持续推进)
- **v8.1 PWA** — manifest + service worker 离线缓存
- **v8.2 路由懒加载** — 50+ chunks 分割，首屏 494KB (down from 1277KB)
- **v8.3 全局搜索中心** — 商品/辩论/资讯/用户/群组 5 类目交叉
- **v8.4 黑暗模式** — 浅/深/系统三档 + 系统跟随
- **v8.5 路由切换动画** — Framer Motion fade+slide
- **v8.6 偏好设置中心** — 主题/语言/减少动效
- **v8.7 创作者个人主页 v2** — 渐变 hero + 6 项统计 + 8 项成就 + 90 天热力图
- **v8.8 推荐系统** — 5 大推荐理由分组 (基于浏览/收藏/相似/热门/高评分)
- **v8.9 管理员高级分析** — KPI + 趋势图 + 模块占比
- **v8.10 可访问性** — 错误边界 + Skip Link + 焦点环 + prefers-reduced-motion
- **v9.1 Stories 24h 故事** — 全屏查看器 + 进度条 + 已看记录
- **v9.3 营销活动专题** — 618/春日/科技节 3 套主题
- **v9.4 购物车自动满减** — 满 300/600/1000 阶梯
- **v9.5 签到日历** — 月历视图 + 连续天数 + 补卡
- **v9.6 商品筛选** — 评分 + 价格 + 品牌 + 标签 + 排序
- **v9.7 单元测试** — Vitest 10 个测试用例

### 🎯 4 阶角色系统
- `guest` 游客
- `user` 普通用户
- `creator` 创作者
- `auditor` 审核员
- `admin` 管理员

## 🛠️ 技术栈

| 类别 | 选型 |
|---|---|
| 前端 | React 19 + TypeScript 6 |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS 4 (Vite 插件) |
| 路由 | React Router 7 |
| 状态 | React Hooks + localStorage |
| 动画 | Framer Motion 12 |
| 图标 | Lucide React |
| 后端 | PocketBase (兼容) / localStorage (默认) |
| 测试 | Vitest 4 |
| 部署 | GitHub Pages (GitHub Actions) |

## 📁 项目结构

```
src/
├── api/            # 数据层 (PocketBase 兼容)
│   ├── store.ts        # localStorage 持久化
│   ├── seed.ts         # 5 个 mock 账号 + 种子数据
│   ├── hooks.ts        # useApi / useUser / usePosts ...
│   ├── types.ts        # User / Post / Comment / Follow ...
│   └── permissions.ts  # 4 阶角色 + 权限
├── components/     # 共享组件
│   ├── layout/         # Header / Footer / MobileNav / Layout / PageTransition
│   ├── shop/           # 购物专属组件
│   ├── social/         # 社交组件 (PostCard, StoriesBar)
│   ├── ui/             # 通用 UI (Button, Badge, Tabs, Toaster)
│   ├── a11y/           # SkipLink
│   └── ErrorBoundary.tsx
├── data/           # 静态种子
│   ├── products.ts     # 12 件商品
│   ├── debates.ts      # 8 场辩论
│   ├── news.ts         # 10 篇资讯
│   ├── users.ts        # 5 个 mock 账号
│   ├── scenarios.ts    # 6 大场景
│   ├── bundles.ts      # 凑单套餐
│   ├── member.ts       # 会员 + 积分
│   ├── messages.ts     # 通知
│   ├── shortVideos.ts  # 短视频
│   └── support.ts      # 客服 FAQ
├── hooks/
│   └── useTheme.tsx    # 主题切换 hook
├── lib/
│   └── utils.ts        # cn / formatCurrency / uid
├── pages/          # 50+ 页面
├── store/
│   ├── versa.ts        # 持久化状态 (购物车/订单/积分/会员)
│   └── compare.ts      # 商品对比
├── App.tsx            # 路由配置 (lazy + Suspense)
├── main.tsx
└── index.css          # Tailwind v4 + @custom-variant dark
```

## 🎨 设计令牌

### 颜色
```css
--color-ink-50..950   /* 中性灰 (背景/文字) */
--color-nova-50..950  /* 紫罗兰 (辩论/链接) */
--color-news-500      /* 琥珀色 (资讯) */
--color-debate-500    /* 红色 (辩题) */
--color-shop-500      /* 玫红 (商品) */
```

### 组件模板
- **渐变 hero** — `bg-gradient-to-br from-X-500 via-Y-500 to-Z-500`
- **大圆卡片** — `rounded-3xl p-6 shadow-2xl`
- **杂志卡片** — 居中大图 + 标签 + 标题 + 描述
- **大按钮** — `px-5 py-2.5 rounded-full` + 渐变 + shadow

## 🚀 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器 (http://localhost:5173)
npm run dev

# 跑测试
npm test

# 构建生产
npm run build

# 预览生产构建
npm run preview
```

## 🔐 Demo 账号

5 个 mock 账号可在登录页直接选择登录：

| 账号 | 角色 | 用途 |
|---|---|---|
| `alice@versa.app` | `user` | 普通用户 |
| `creator@versa.app` | `creator` | 创作者 |
| `mod@versa.app` | `auditor` | 审核员 |
| `admin@versa.app` | `admin` | 管理员 |
| `demo@versa.app` | `user` | 演示账号 |

## 📜 设计哲学

### 三体融合
- **新闻 → 辩论** — 每篇新闻有对应辩题
- **辩论 → 商品** — 辩题推荐相关商品
- **商品 → 新闻** — 商品详情关联新闻测评

### 用户体验
- 杂志/苹果风 hero
- 5 类目交叉搜索
- 全屏 stories 查看器
- 拖拽式购物车
- 渐变 + glass + 圆角 + 大留白

## 📝 License

MIT
