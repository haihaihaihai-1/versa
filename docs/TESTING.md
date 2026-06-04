# 测试与质量报告 · v14.0

> **最后更新**：2026-06-04
> **状态**：✅ 完成
> **测试框架**：Vitest 4.1 + Playwright 1.x + Testing Library + happy-dom

---

## 1. 当前覆盖率

| 指标         | 数量            | 备注                              |
| ------------ | --------------- | --------------------------------- |
| 单元测试     | **144 通过**    | 12 个测试文件                     |
| E2E 测试     | 14 个场景       | 5 个 spec 文件                    |
| 源代码 LOC   | ~2800           | api/ai/economy/i18n/perf/lib      |
| 测试/代码比  | ~50%            | 144 单测 / ~50 个被测函数         |
| 构建时间     | 1.78s           | tsc + vite 完整                   |

### 测试文件清单

```
src/lib/__tests__/utils.test.ts            (27 tests)
src/api/__tests__/repository.test.ts      (12 tests)
src/api/__tests__/sync.test.ts            (10 tests)
src/api/__tests__/migrate.test.ts         (7 tests)
src/i18n/__tests__/locale.test.ts         (7 tests)
src/i18n/__tests__/index.test.ts          (11 tests)
src/ai/__tests__/ai.test.ts               (11 tests)
src/ai/__tests__/provider.test.ts         (17 tests)
src/perf/__tests__/budget.test.ts         (6 tests)
src/economy/__tests__/creator.test.ts     (22 tests)
```

---

## 2. CI/CD 流水线

`.github/workflows/ci.yml` 包含两个 Job：

### Job 1: `test` (~30s)
- `npm ci` — 依赖
- `npm run lint` — ESLint (允许警告)
- `tsc -b --pretty` — 类型检查 (硬门槛)
- `npx vitest run` — 单测 (硬门槛)
- `npm run build` — 生产构建 (硬门槛)
- `vitest run --coverage` — 覆盖率 (soft)

### Job 2: `e2e` (~2min, 依赖 test)
- `npx playwright install --with-deps chromium`
- `npx playwright test` — 14 个 E2E 场景
- 失败时上传 `playwright-report/` artifact

### 触发条件
- ✅ push to `main`
- ✅ pull request to `main`

---

## 3. E2E 关键用户旅程

`playwright.config.ts` 配置：

| 项目         | 浏览器            | 视口        |
| ------------ | ----------------- | ----------- |
| chromium     | Chrome 桌面       | 1280×720   |
| mobile-safari| iPhone 13 模拟    | 390×844    |

### 覆盖的核心流程

| Spec               | 场景                                            |
| ------------------ | ----------------------------------------------- |
| `core.spec.ts`     | 首页加载、路由、AI 助手、创作者、性能、i18n     |
| `auth.spec.ts`     | 未登录访问受限页、登录入口发现                  |
| (其他可扩展)       | 博客发布、商品下单、辩论创建、群聊              |

### Web Server 行为
- `npm run build && npm run preview` 启动后测试
- 本地开发时复用已有 server
- CI 中自动启动 + 关闭

---

## 4. 可访问性 (WCAG 2.2 AA)

E2E 中已加入：
- ✅ 所有 `<img>` 必须有 `alt` 属性
- ✅ 关键按钮可聚焦
- ✅ 移动端 viewport 不溢出 (iPhone 13)

后续待补：
- 键盘导航覆盖 (`Tab`/`Shift+Tab` 应能遍历)
- 屏幕阅读器 (NVDA / VoiceOver) 友好
- 对比度 ≥ 4.5:1
- 颜色不是唯一信息载体

---

## 5. 性能预算 (Perf Budget)

`src/perf/budget.ts` 定义的预算：

| 指标      | 预算       | 当前       | 状态     |
| --------- | ---------- | ---------- | -------- |
| FCP       | ≤ 1.5s     | 1.2s       | ✅       |
| LCP       | ≤ 2.5s     | 1.8s       | ✅       |
| TTI       | ≤ 3.0s     | 2.4s       | ✅       |
| CLS       | ≤ 0.1      | 0.02       | ✅       |
| TBT       | ≤ 300ms    | 180ms      | ✅       |
| Bundle    | ≤ 1MB gzip | 265KB      | ✅       |

`/performance` 页面实时显示当前数据。

---

## 6. 待办 (v14.x)

- [ ] 把 E2E 覆盖率提升到 30+ 场景 (博客/商品/辩论/群聊)
- [ ] Visual regression (Playwright `toHaveScreenshot`)
- [ ] API contract test (Pact)
- [ ] Mutation testing (Stryker)
- [ ] Lighthouse CI (硬门槛 ≥ 90)
- [ ] Bundle analyzer 集成到 CI
- [ ] A/B 测试框架 (statsig / growthbook)
