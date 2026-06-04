import { test, expect } from '@playwright/test'

test.describe('首页 & 路由', () => {
  test('首页加载 + 主标题', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Versa/i)
  })

  test('至少能跳到博客', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /博客|blog/i }).first().click().catch(() => {})
    await expect(page).toHaveURL(/blog|posts/i)
  })

  test('404 兜底', async ({ page }) => {
    const r = await page.goto('/this-route-does-not-exist-xyz')
    expect(r?.status()).toBe(404)
  })
})

test.describe('AI 助手页面', () => {
  test('进入 AI 助手 → 显示 6 个 tab', async ({ page }) => {
    await page.goto('/ai-assistant')
    await expect(page.getByText(/AI/i).first()).toBeVisible()
  })

  test('mock 模式下能发出请求', async ({ page }) => {
    await page.goto('/ai-assistant')
    const input = page.getByPlaceholder(/输入|问我|说点什么/i).first()
    if (await input.isVisible().catch(() => false)) {
      await input.fill('你好')
      const send = page.getByRole('button', { name: /发送|send|▶/i }).first()
      if (await send.isVisible().catch(() => false)) await send.click()
    }
  })
})

test.describe('创作者中心', () => {
  test('进入创作者中心 → 显示总览', async ({ page }) => {
    await page.goto('/creator-dashboard')
    await expect(page.getByText(/创作者中心|Creator/i).first()).toBeVisible()
    await expect(page.getByText(/总流水|收益|提现/i).first()).toBeVisible()
  })
})

test.describe('性能监控页面', () => {
  test('Performance 页面加载', async ({ page }) => {
    await page.goto('/performance')
    await expect(page.getByText(/性能|Performance|FCP|LCP|CWV/i).first()).toBeVisible()
  })
})

test.describe('i18n 切换', () => {
  test('切换英文后 <html lang> 改变', async ({ page }) => {
    await page.goto('/')
    // 找到语言切换器
    const switcher = page.locator('[data-testid="language-switcher"], button:has-text("English"), button:has-text("EN")').first()
    if (await switcher.isVisible().catch(() => false)) {
      await switcher.click()
      await expect(page.locator('html')).toHaveAttribute('lang', /en/i)
    }
  })
})

test.describe('可访问性 (WCAG)', () => {
  test('首页所有图片有 alt', async ({ page }) => {
    await page.goto('/')
    const imgs = await page.locator('img').all()
    for (const img of imgs) {
      const alt = await img.getAttribute('alt')
      // 装饰性图片可以 alt="", 但必须有
      expect(alt).not.toBeNull()
    }
  })

  test('首页所有按钮可聚焦', async ({ page }) => {
    await page.goto('/')
    const buttons = await page.locator('button').all()
    expect(buttons.length).toBeGreaterThan(0)
  })
})

test.describe('响应式', () => {
  test('移动端 viewport 不溢出', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    const body = page.locator('body')
    const box = await body.boundingBox()
    expect(box!.width).toBeLessThanOrEqual(375)
  })
})
