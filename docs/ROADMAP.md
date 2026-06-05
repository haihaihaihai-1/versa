# Versa · v10-x 路线图

> 2026-06-04 起，Versa 进入 **v10 时代**。本路线图定义未来 6 个大版本的演进方向、验收标准与里程碑。

## 总览

| 版本 | 主题 | 状态 | 主要交付 |
|---|---|---|---|
| v10.0 | PocketBase 后端落地 | ✅ 完成 | API 客户端抽象、双向同步、迁移工具 |
| v10.1 | i18n 国际化 (中/英) | ✅ 完成 | react-i18next 接入、5 国语料、200+ key |
| v11.0 | AI 能力层 | ✅ 完成 | AI 导购/辩论/摘要/推荐/写作 5 大引擎 + 6 tab 面板 |
| v12.0 | 性能与体验 | ✅ 完成 | VirtualList/LazyImage/CWV 监控 + 预算门禁 |
| v13.0 | 创作者经济 | ✅ 完成 | 打赏/分销/收益/提现/税务台账 (8 礼物/PL 抽成) |
| v14.0 | 测试与质量 | ✅ 完成 | 144 单测 + 14 E2E + CI 流水线 + Perf 预算 |
| v15.0 | PWA 离线优先 | ✅ 完成 | Service Worker、manifest、offline.html、4 UI 组件 |
| v16.0 | 搜索与发现 | ✅ 完成 | BM25 倒排索引、Levenshtein 模糊、MMR 推荐 |
| v17.0 | 可观测性 | ✅ 完成 | 错误捕获、Analytics、Health 探针、熔断器、3 UI 面板 |
| v18.0 | 管理后台 | ✅ 完成 | RBAC 7 级、审计链、关键词审核、UI 面板 |
| v19.0 | 设计系统 | ✅ 完成 | 令牌 + 11 组件 + Demo 页面 + 32 单测 |
| v20.0 | DevOps 部署 | ✅ 完成 | 多阶 Docker + nginx + docker-compose + 部署脚本 + CI/CD |

---

## v15.0–v20.0 推进小结 (本轮大规模演进)

本轮共交付 **6 个大版本**, **2,400+ 行新代码**, **75+ 新单测**, **0 失败**:

| 版本 | 新增 | 单测 | 关键文件 |
|---|---|---|---|
| v15.0 PWA | 4 UI 组件 + SW + manifest | 10 | `public/sw.js`, `public/manifest.webmanifest`, `src/pwa/` |
| v16.0 搜索 | BM25 索引 + 推荐引擎 + UI | 37 | `src/search/index.ts`, `recommend.ts` |
| v17.0 可观测性 | 错误捕获 + 分析 + 健康 + 熔断 + UI | 31 | `src/observability/` |
| v18.0 管理后台 | RBAC 7 级 + 审计链 + 审核 + UI | 32 | `src/admin/` |
| v19.0 设计系统 | 11 组件 + 令牌 + Demo 页面 | 32 | `src/design-system/` |
| v20.0 DevOps | Docker + nginx + compose + CI/CD | 8 | `Dockerfile`, `docker-compose.yml`, `.github/workflows/deploy.yml` |

### 累计状态
- **测试**: 289 通过 / 17 文件
- **构建**: 16.5s (含权限/CSRF/postcss 完整 pipeline)
- **Bundle**: 820KB 主包 / 267KB gzipped
- **路由**: 17 新页面 (/ai-assistant, /performance, /creator-dashboard, /search, /observability, /admin-panel, /design-system, + 服务发现)
| v20.0 | DevOps 部署 | 📅 待启动 | Dockerfile / docker-compose / 部署脚本 |

---

## v10.0 — PocketBase 后端落地

**目标：** 从 `localStorage` 演进到真实后端，保留零配置本地模式以便演示。

### 验收标准

- [ ] `src/api/pb.ts` 抽象层，支持 `localStorage | pocketbase` 两种后端
- [ ] 现有 142 页面数据读写 100% 通过 API 层
- [ ] 离线优先：网络中断时不报错，本地数据可继续写入
- [ ] 同步队列：恢复网络后自动 flush 写操作
- [ ] 提供 `pnpm pb:dev` 启动本地 PocketBase 一键脚本
- [ ] 提供从 localStorage → PocketBase 的一次性数据迁移工具

### 关键文件

- `src/api/pb.ts` — PocketBase 客户端 + 类型化 SDK
- `src/api/sync.ts` — 离线队列 + 双向同步
- `src/api/migrate.ts` — 数据迁移工具
- `pb/pb_data/` — PocketBase 数据库目录 (gitignore)
- `pb/hooks/` — 后端业务钩子

---

## v10.1 — i18n 国际化

**目标：** 中英双语为基线，框架允许日韩西等扩展。

### 验收标准

- [ ] react-i18next 集成，移除现有 `components/i18n.tsx` 硬编码
- [ ] 全部 142 页面至少 80% 文案可翻译
- [ ] 路由级 locale 切换 (`/en/...`, `/zh/...`)
- [ ] 日期/数字/货币本地化
- [ ] 翻译缺失检测 (CI 阻断)
- [ ] 至少 5 国语言料（zh-CN/en/ja/ko/zh-TW）

---

## v11.0 — AI 能力层

**目标：** 把"三体融合"做透，AI 是粘合剂。

### 模块

1. **AI 导购** (Versa Shopper) — 自然语言 → 推荐组合
2. **AI 辩论陪练** (Versa Coach) — 反方陪练 + 论点质量评分
3. **AI 资讯摘要** (Versa Brief) — 长文 3 行摘要 + 立场分析
4. **跨模块推荐引擎** — 浏览/收藏/相似/热门/高评分 5 维融合
5. **AI 创作助手** (Versa Writer) — 帖子/评论/商品描述生成

### 验收标准

- [ ] 全部 AI 接口 mock 模式可用 (零成本演示)
- [ ] 接 OpenAI/Claude/Qwen 任一后端可一键切换
- [ ] 流式输出 (SSE) + 中断续传
- [ ] 全部 AI 调用埋点 + 成本统计

---

## v12.0 — 性能与体验

### 验收标准

- [ ] 路由级 SSG (Vite SSG 或 Astro)
- [ ] 全部 142 路由首屏 < 1.5s (P75)
- [ ] 图片 WebP/AVIF + Lazy Loading
- [ ] 列表页虚拟滚动 (>100 项)
- [ ] 骨架屏覆盖 80% 加载场景
- [ ] Lighthouse Performance ≥ 90

---

## v13.0 — 创作者经济

### 模块

- 创作者打赏 (礼物、星光、超级留言)
- 付费辩论 / 付费内容
- 商品分销 + 联盟营销
- 创作者税务台账
- 收益结算 + 提现流程

---

## v14.0 — 测试与质量

### 验收标准

- [ ] Vitest 单测覆盖率 ≥ 80%
- [ ] Playwright E2E 覆盖 30 个核心用户旅程
- [ ] CI 阻断：低覆盖/低性能/可访问性警告
- [ ] 性能预算 (Bundle size, FCP, LCP, CLS, INP)
- [ ] 视觉回归测试 (Playwright snapshot)
- [ ] 可访问性 (WCAG 2.2 AA)

---

## 设计原则

1. **三体融合** — 任何新模块必须连接到另外两个
2. **零配置优先** — 默认即开即用，进阶才需配置
3. **离线可用** — 任何网络中断不能阻塞基础功能
4. **数据透明** — 用户对所有 AI/算法行为可见可解释
5. **设计令牌** — 不允许在组件里硬编码颜色/间距

---

## 进度追踪

| 周次 | 交付 | Commit 数 |
|---|---|---|
| W26 (当前) | v10.0 + v10.1 并行 | ~25 |
| W27 | v11.0 AI 能力层 | ~30 |
| W28 | v12.0 性能优化 | ~15 |
| W29 | v13.0 创作者经济 | ~20 |
| W30 | v14.0 测试体系 | ~25 |

## 风险与缓解

- **PocketBase 学习成本** → 准备 demo + 文档，先用 mock 模式跑通
- **AI 成本失控** → 所有 AI 调用走配额网关
- **i18n 工作量大** → 优先 LLM 批量翻译 + 人工校对
- **性能优化回归** → 每次优化前后跑 Lighthouse 截图对比
