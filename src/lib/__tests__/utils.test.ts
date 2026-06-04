// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatNumber, formatTimeAgo, formatDate, calcReadTime, uid, clamp, slugify } from '../utils'

describe('utils · cn', () => {
  it('合并多个类名', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })
  it('过滤 falsy', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
  it('去重 tailwind 冲突', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})

describe('utils · formatCurrency', () => {
  it('¥ 1234.5', () => {
    expect(formatCurrency(1234.5)).toMatch(/1,235/)  // 0 位小数
  })
  it('¥ 0', () => {
    expect(formatCurrency(0)).toMatch(/0/)
  })
})

describe('utils · formatNumber', () => {
  it('< 1000 不变', () => {
    expect(formatNumber(999)).toBe('999')
  })
  it('K 后缀', () => {
    expect(formatNumber(1500)).toBe('1.5K')
    expect(formatNumber(10000)).toBe('10.0K')
  })
  it('M 后缀', () => {
    expect(formatNumber(2_500_000)).toBe('2.5M')
  })
})

describe('utils · formatTimeAgo', () => {
  const now = new Date()
  it('刚刚', () => {
    expect(formatTimeAgo(now.toISOString())).toBe('刚刚')
  })
  it('分钟前', () => {
    const t = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    expect(formatTimeAgo(t)).toMatch(/5 分钟前/)
  })
  it('小时前', () => {
    const t = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
    expect(formatTimeAgo(t)).toMatch(/3 小时前/)
  })
  it('天前', () => {
    const t = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatTimeAgo(t)).toMatch(/2 天前/)
  })
  it('月前', () => {
    const t = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatTimeAgo(t)).toMatch(/个月前/)
  })
  it('年前', () => {
    const t = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatTimeAgo(t)).toMatch(/年前/)
  })
})

describe('utils · formatDate', () => {
  it('2026-06-04 → 含 2026', () => {
    expect(formatDate('2026-06-04')).toMatch(/2026/)
  })
})

describe('utils · calcReadTime', () => {
  it('400 字 = 1 分钟', () => {
    expect(calcReadTime('a'.repeat(400))).toBe(1)
  })
  it('500 字 = 2 分钟', () => {
    expect(calcReadTime('a'.repeat(500))).toBe(2)
  })
  it('空字符串 ≥ 1', () => {
    expect(calcReadTime('')).toBeGreaterThanOrEqual(1)
  })
})

describe('utils · uid', () => {
  it('带前缀', () => {
    expect(uid('user')).toMatch(/^user_/)
  })
  it('每次不同', () => {
    const a = uid()
    const b = uid()
    expect(a).not.toBe(b)
  })
})

describe('utils · clamp', () => {
  it('范围内', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })
  it('低于下限', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })
  it('高于上限', () => {
    expect(clamp(20, 0, 10)).toBe(10)
  })
})

describe('utils · slugify', () => {
  it('英文转小写 + 短横线', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })
  it('保留中文', () => {
    expect(slugify('购物 商品')).toBe('购物-商品')
  })
  it('去掉首尾短横线', () => {
    expect(slugify('---abc---')).toBe('abc')
  })
  it('多符号合并', () => {
    expect(slugify('foo   bar  baz')).toBe('foo-bar-baz')
  })
})
