# Versa 项目跟进笔记

> 仓库：`haihaihaihai-1/versa`（Versa - Shopping, Debate, News unified platform）
> 本地路径：`C:\Users\许泉兴\versa`
> 远程：https://github.com/haihaihaihai-1/versa
> 默认分支：`main`（已配置 token 在 remote URL 中）

## 同步命令

```bash
# 拉取最新
git -C "C:\Users\许泉兴\versa" fetch origin
git -C "C:\Users\许泉兴\versa" pull --rebase origin main

# 查看最新 N 条
git -C "C:\Users\许泉兴\versa" log --oneline -20

# 查 GitHub 活动
gh api repos/haihaihaihai-1/versa/commits
gh issue list --repo haihaihaihai-1/versa
gh pr list --repo haihaihaihai-1/versa
```

## 当前状态（2026-06-05 抓取）

- **HEAD**：本地 HEAD — v34.0 API Gateway（待推送）
- **作者**：ErnestRayleign（ernestrayleign@stu.xhu.edu.cn）
- **最新推送**：2026-06-05 21:00 CST
- **分支**：仅 `main`（无其他活跃分支）
- **Issues / PRs / Releases**：均无
- **本地工作区**：即将推送 v34.0
- **总提交数**：约 135+ 条（v10.0 起大幅推进）
- **代码量**：610+ 个 TS/TSX 文件
- **测试**：907 通过 / 31 文件

## 里程碑（按时间倒序）

### 阶段 A：v10–v30 平台能力（2026-06-04 → 06-05）
| 版本 | 主题 | 单测 |
|---|---|---|
| v34.0 | API Gateway（Routes/Middleware:Auth/RateLimit/CORS/Cache/Transform/Validate/Logging/Metrics） | 67 |
| v33.0 | Secrets/Vault（SecretStore/Encryption/Versioning/Policies/Audit/Rotation/Scanner/Resolver） | 58 |
| v32.0 | Job Queue（JobQueueSystem/Registry/Worker/Scheduler/Retry/DLQ/Events/Metrics） | 54 |
| v31.0 | Notification（Channel/Template/Queue/Preference/Throttle/Digest/Provider/Metrics） | 54 |
| v30.0 | Privacy/GDPR（Consent/PII 分类/匿名化/数据导出/被遗忘权/保留/DSR/Cookie） | 39 |
| v29.0 | Multi-tenancy（Tenant/Quota/Billing/Router/Audit/Feature/Isolation/Context） | 40 |
| v28.0 | Workflow Engine（DAG 拓扑 + Step/Handler/EventBus/Saga/Scheduler/Metrics） | 30 |
| v27.0 | Federation（Registry/Health/LB/CB/Retry/Router/Stitcher/Metrics） | 57 |
| v26.0 | Edge Computing（GeoIP/Cache/Sandbox/KV/RateLimit/Router/Metrics/Prefetch） | 74 |
| v25.0 | 向量检索 + RAG（hash embedding + BM25 混合 + 重排） | 33 |
| v24.0 | GraphQL Gateway（自研 schema/parser/executor/DataLoader/订阅） | 29 |
| v23.0 | 插件系统（注册表/沙箱/事件总线/权限/市场） | 34 |
| v22.0 | ML 训练流水线（数据集/注册表/训练/评估/A-B/Feature Store） | 33 |
| v21.0 | 实时协作（WebSocket/SSE/Mock + Channel + Presence） | 16 |
| v20.0 | 部署流水线（Docker + nginx + CI/CD） | 8 |
| v19.0 | 设计系统（令牌 + 11 组件 + Demo） | 32 |
| v18.0 | 管理后台（RBAC + 审计哈希链 + 审核 + UI） | — |
| v17.0 | 可观测性（Sentry-style + GA 漏斗 + 熔断） | 31 |
| v16.0 | 搜索与发现（BM25 + 推荐 + MMR） | 37 |
| v15.0 | PWA + 离线 App（SW/Manifest/Install/BG Sync） | 10 |
| v14.0 | 测试与质量（144 单测 + 14 E2E + CI + Perf 预算） | 144 |
| v13.0 | 创作者经济（打赏/分销/收益/提现/税务） | 22 |
| v12.0 | 性能（虚拟列表 + 懒加载 + CWV + 性能预算） | 9 |
| v11.0 | 5 大 AI 能力（导购/辩论/摘要/写作/推荐） + 路由 `/ai-assistant` | 11 |
| v10.1 | i18n（react-i18next + 200+ 翻译键） | 7 |
| v10.0 | PocketBase 后端抽象 + 离线同步队列 | 12 |

### 阶段 B：v34–v46 主题工具集（2026-06-02 → 06-03，Versa Bot 自动提交）
工具聚合页，每个版本 6–8 个组件 + 一个 Hub：

- v46 Astrology + Gardening（6+6 组件）
- v45 Math + Car（6 + 7 组件）
- v44 Photography（7 组件）
- v43 AI Hub（8 组件）
- v42 Pets（7 组件 + PetHub）
- v41 Family（8 组件 + FamilyHub）
- v40 Music（6 组件 + MusicHub）
- v39 Food（7 组件 + FoodHub）
- v38 Learn（7 组件 + LearnHub）
- v37 Invest（8 组件 + InvestHub）
- v36 Travel（7 组件 + TravelHub）
- v35 Health（7 组件 + HealthHub）
- v34 Finance（7 组件 + FinanceHub）

## 待跟进

- [ ] v26.0+ 计划（路线图停留在 v14，需关注 ROADMAP.md 更新）
- [ ] Issues / PR 体系（目前 0，可能即将启用）
- [ ] Releases / Tag 体系（目前未打 tag）
- [ ] CI/CD 工作流（`.github/workflows/`）— 克隆时已见 deploy.yml
