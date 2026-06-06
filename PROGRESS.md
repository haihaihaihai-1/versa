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

- **HEAD**：本地 HEAD — v67.0 Blue-Green Deployment（待推送）
- **远程 origin/main**：`6701d0f`（v66.0 Feature Flag Targeting，已推送）
- **本地工作区**：即将推送 v67.0 Blue-Green Deployment
- **测试**：2084 通过 / 60 文件

## 里程碑（按时间倒序）

### 阶段 A：v10–v30 平台能力（2026-06-04 → 06-05）
| 版本 | 主题 | 单测 |
|---|---|---|
| v34.0 | API Gateway（Routes/Middleware:Auth/RateLimit/CORS/Cache/Transform/Validate/Logging/Metrics） | 67 |
| v35.0 | Feature Flag Service（Flags/Segments/Experiments/Evaluator/Consistent-Hash Bucket） | 48 |
| v36.0 | Distributed Lock（Redlock 风格/fencing token/自动续约/Resource Queue/健康检查） | 33 |
| v37.0 | File Storage（S3 兼容：桶/分片/策略/生命周期/预签名 URL/版本） | 42 |
| v38.0 | Stream Processing（Kafka 风格：topic/分区/消费组/rebalance/offset/窗口） | 34 |
| v39.0 | Config Service（集中配置/版本历史/watchers/灰度/校验） | 41 |
| v40.0 | IAM（用户/组/角色/策略/会话/MFA/条件授权/资源 ACL） | 46 |
| v41.0 | Search Engine（倒排索引/BM25/字段加权/模糊/布尔查询/高亮/ngram/分词） | 39 |
| v42.0 | API Mock Service（HTTP stub/序列/模板/动态/代理/故障/场景/录制/日志/Webhook） | 39 |
| v43.0 | Rate Limiter（fixed/sliding/token/leaky/GCRA + headers + 自适应 + 分布式同步） | 33 |
| v44.0 | Webhook Delivery（订阅/HMAC签名/重试/DLQ/重放/metrics） | 35 |
| v45.0 | Notification Center（多渠道/模板/偏好/静默/分组/调度/限流/i18n） | 46 |
| v46.0 | GraphQL Gateway（Federation/Upstream/Parser/Planner/DataLoader/Cache/Subscriptions/APQ/Metrics） | 35 |
| v47.0 | Event Sourcing（Aggregate/Snapshot/Projection/Saga/Schema/Time-travel/Subscribe） | 36 |
| v48.0 | Realtime Manager（WebSocket/Rooms/Presence/Routing/Heartbeat/Backpressure/Hooks） | 45 |
| v49.0 | Cache Layer（LRU/LFU/FIFO/TTL/Namespaces/Tags/Singleflight/SWR/Memoize/Bus） | 36 |
| v50.0 | CQRS（Command/Query/Middleware/Read-model/Event-Bus/Auth/Metrics） | 27 |
| v51.0 | Task Scheduler（Cron/Delay/Recurring/Misfire/Retry/Concurrency/History） | 39 |
| v52.0 | API Client SDK Generator（OpenAPI/GraphQL → TS/JS/Python/Go/cURL） | 36 |
| v53.0 | Feature Experiment（A-B/n/Hash-Bucket/Targeting/Ramp/Holdout/Significance） | 39 |
| v54.0 | Multi-DC Replication（Vector-Clock/LWW/Max/Min/Merge/Quorum/Merkle） | 44 |
| v55.0 | CRDT Collaboration（GCounter/PNCtr/Set/2P/OR/LWW/MV/RGA/Map/Peers/Sync） | 47 |
| v56.0 | Observability / Distributed Tracing（W3C/Span/Event/Link/Counter/Gauge/Histogram） | 47 |
| v57.0 | Edge Functions / Serverless（Route/Middleware/ColdStart/Timeout/Region/Triggers） | 44 |
| v58.0 | Secret Vault（PBKDF2/AES-256-GCM/Version/Rotation/DynamicLease/Template/RBAC/Audit/Backup） | 43 |
| v59.0 | Code Sandbox（VM/Timeout/ForbiddenGlobals/Modules/Template/Registry/Metrics） | 32 |
| v60.0 | SQL Query Builder（SELECT/INSERT/UPDATE/DELETE/JOIN/GROUP/UNION/Dialects/Aggregates） | 52 |
| v61.0 | Geo / Location（Haversine/Vincenty/Geohash/GeoIndex/Geofence/Polygon） | 39 |
| v62.0 | Time Series DB（Series/Downsample/7Agg/Interpolate/ContinuousQuery/Retention） | 41 |
| v63.0 | Workflow Engine（Steps/Parallel/Compensate/Retries/Signals/Timers/Snapshot） | 33 |
| v64.0 | ML Pipeline（5Models/Scaling/CV/GridSearch/FeatureEng） | 36 |
| v65.0 | Schema Registry（JSON/Avro/Compat4Modes/Migration/Codec/Refs） | 34 |
| v66.0 | Feature Flag Targeting（Segments/Rules/Variants/Rollout/Dependencies/Kill） | 40 |
| v67.0 | Blue-Green Deployment（Env/Health/Route/Rollback/AutoRollback/History） | 30 |
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
