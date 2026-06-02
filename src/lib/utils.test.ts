import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNumber, cn, formatTimeAgo, uid } from './utils'

describe('formatCurrency', () => {
  it('formats numbers with commas and ¥ prefix', () => {
    expect(formatCurrency(1234)).toBe('¥1,234')
    expect(formatCurrency(1234567)).toBe('¥1,234,567')
  })
  it('handles zero and small numbers', () => {
    expect(formatCurrency(0)).toBe('¥0')
    expect(formatCurrency(99)).toBe('¥99')
  })
})

describe('formatNumber', () => {
  it('formats with K/M suffix for big numbers', () => {
    expect(formatNumber(1500)).toBe('1.5K')
    expect(formatNumber(1_500_000)).toBe('1.5M')
    expect(formatNumber(500)).toBe('500')
  })
})

describe('cn', () => {
  it('joins truthy classnames', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })
  it('filters out falsy', () => {
    expect(cn('a', false, null, undefined, 'b', '')).toBe('a b')
  })
})

describe('formatTimeAgo', () => {
  it('returns 刚刚 for very recent', () => {
    const past = new Date(Date.now() - 30_000).toISOString()
    expect(formatTimeAgo(past)).toBe('刚刚')
  })
  it('returns minutes', () => {
    const past = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatTimeAgo(past)).toBe('5 分钟前')
  })
  it('returns days', () => {
    const past = new Date(Date.now() - 3 * 24 * 3600_000).toISOString()
    expect(formatTimeAgo(past)).toBe('3 天前')
  })
  it('returns months', () => {
    const past = new Date(Date.now() - 60 * 24 * 3600_000).toISOString()
    expect(formatTimeAgo(past)).toBe('2 个月前')
  })
})

describe('uid', () => {
  it('generates unique ids with prefix', () => {
    const a = uid('test')
    const b = uid('test')
    expect(a).not.toBe(b)
    expect(a).toMatch(/^test_/)
  })
})
