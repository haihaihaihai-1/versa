# Versa · 三体融合平台

> **新闻激发辩论 · 辩论推荐商品 · 商品成为新闻**
> 一个把资讯、辩论、购物编织成完整回路的内容社区。

[![Live Demo](https://img.shields.io/badge/Live-https://haihaihaihai-1.github.io/versa/--blue)](https://haihaihaihai-1.github.io/versa/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646cff)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)](https://tailwindcss.com)

## 核心理念

Versa 不是一个资讯站，不是一个辩论场，也不是一个购物平台——它是**这三者的有机融合**。

```
   资讯 ─── 激发 ──→ 辩论 ─── 推荐 ──→ 商品
    ↑                                          │
    └──────────────── 验证 ←──────────────────┘
```

当你读一篇文章、参与一场辩论、做出一次消费选择时，这三件事在 Versa 形成一个完整的回路。

## ✨ 核心特性

### 🟡 资讯 News
- 10+ 篇深度文章（科技、财经、文化、科学、国际、生活）
- 7 种分类筛选 + 全文搜索
- 阅读进度跟踪、点赞/启发/存疑三种反应
- 相关辩论、商品交叉链接

### 🔴 辩论 Debate
- 8+ 进行中的观点交锋
- 正反方投票、热度排序
- 观点列表 + 嵌套回复（mock）
- 跨模块链接：来自资讯 / 推荐商品

### 🟢 购物 Shop
- 12+ 精选商品（数码、服饰、家居、图书、食品、美妆、运动）
- 价格区间、品牌、评分多维筛选
- 购物车、收藏、模拟结算全流程
- 商品页附带相关资讯、相关辩论

### 🌟 三体融合（独家）
- 任何**资讯**都可以延伸出**辩论**
- 任何**辩论**都可以推荐**商品**
- 任何**商品**都可以关联**资讯**
- 用户跨模块活动累计**声誉值** + 9 种勋章
- 个人中心显示**三模块足迹** + 跨模块**活动流**

## 🛠 技术栈

| 层级 | 选型 |
|---|---|
| 框架 | React 19 + Vite 8 |
| 样式 | Tailwind CSS 4 (with `@tailwindcss/vite`) |
| 路由 | React Router 7 |
| 动效 | Framer Motion |
| 图标 | Lucide React + 自绘 BrandIcons |
| 状态 | 自研 `useVersa` hook + localStorage 持久化 |
| 类型 | TypeScript 6 |
| 部署 | GitHub Pages via GitHub Actions |

## 🚀 快速开始

```bash
# 克隆
git clone https://github.com/haihaihaihai-1/versa.git
cd versa

# 安装依赖（推荐 npm 或 pnpm）
npm install

# 本地开发
npm run dev
# 打开 http://localhost:5173/versa/

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 📦 项目结构

```
versa/
├── src/
│   ├── components/
│   │   ├── layout/      # Header, Footer, MobileNav, Layout
│   │   ├── ui/          # Button, Card, Badge, Tabs, Toaster, ...
│   │   ├── news/        # NewsCard
│   │   ├── debate/      # DebateCard
│   │   └── shop/        # ProductCard
│   ├── pages/           # 15 个页面（Home/List/Detail/Cart/Checkout/Profile/...）
│   ├── data/            # 种子数据：news, debates, products, users
│   ├── store/
│   │   └── versa.ts     # 全局状态 + localStorage + 积分系统
│   ├── hooks/           # useTheme, useScrollPosition
│   ├── lib/             # utils (cn, formatCurrency, formatTimeAgo, ...)
│   ├── App.tsx          # 路由表
│   ├── main.tsx         # 入口
│   └── index.css        # Tailwind 4 + 设计系统
├── public/
│   └── favicon.svg      # 渐变 V 标志
├── .github/workflows/
│   └── deploy.yml       # GitHub Pages 自动部署
└── vite.config.ts
```

## 🏆 声誉系统

在 Versa 的所有跨模块活动都会累积**声誉值**：

| 行为 | 奖励 |
|---|---|
| 读完一篇文章（≥80%） | +5 |
| 对资讯表达态度 | +3 |
| 参与一次辩论投票 | +8 |
| 在辩论中发表观点 | +15 |
| 收藏一件商品 | +2 |
| 完成一次购买 | +30 |
| 访问一个模块 | +1 |

声誉等级：初探者 → 浏览者 → 参与者 → 贡献者 → 行家 → 鉴赏家 → 思想家 → 贤者

## 🎨 设计系统

- **主色（Nova）**: 紫罗兰，象征"第三空间"
- **资讯色（News）**: 琥珀金，象征真相与价值
- **辩论色（Debate）**: 玫瑰红，象征交锋与活力
- **购物色（Shop）**: 翡翠绿，象征成长与信任
- **中性色（Ink）**: 9 级灰度
- **字体**: Inter (UI) + Source Serif 4 (标题) + JetBrains Mono (代码)
- **特性**: 浅/深/跟随系统三主题，玻璃拟态，毛玻璃，渐变徽章

## 📝 路线图

- [x] 三模块完整闭环
- [x] 跨模块声誉系统 + 勋章
- [x] 暗色模式
- [x] 响应式（移动端底部 Tab）
- [x] GitHub Pages 自动部署
- [ ] 后端对接（Supabase / PocketBase / 自建 Node）
- [ ] 真实支付（Stripe / 微信支付 / 支付宝）
- [ ] 评论嵌套树
- [ ] 全文搜索（Meilisearch / Algolia）
- [ ] 推送通知
- [ ] 多语言（i18n）
- [ ] 实时辩论（WebSocket）

## 🤝 贡献

欢迎 PR 和 Issue。提交前请运行：

```bash
npm run lint
npm run build
```

## 📄 许可

MIT License · © 2026 Versa

---

**构建者的话**：Versa 是一个关于"信息如何更聪明地流向消费决策"的实验。资讯-辩论-购物三者的关系，过去是被割裂的：你在新闻 App 读，在论坛辩论，在电商购物。Versa 试图把它们拉回到一个回路里——你读的东西影响你的判断，你的判断决定你的参与，你的参与又回到内容本身。代码是新的，理念是老的。Enjoy。
