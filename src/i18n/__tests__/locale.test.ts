// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNumber, formatDate, relativeTime, langToBCP47 } from '../locale'

describe('locale utilities', () => {
  it('langToBCP47 maps correctly', () => {
    expect(langToBCP47('zh-CN')).toBe('zh-CN')
    expect(langToBCP47('zh-TW')).toBe('zh-Hant')
    expect(langToBCP47('en')).toBe('en-US')
    expect(langToBCP47('ja')).toBe('ja-JP')
    expect(langToBCP47('ko')).toBe('ko-KR')
    expect(langToBCP47('xx')).toBe('xx')
  })

  it('formatCurrency CNY zh-CN', () => {
    const s = formatCurrency(1234.5, 'CNY', 'zh-CN')
    expect(s).toContain('1,234.5')
  })

  it('formatCurrency USD en-US', () => {
    const s = formatCurrency(1234.5, 'USD', 'en-US')
    expect(s).toContain('1,234.5')
    expect(s).toMatch(/\$/)
  })

  it('formatNumber 千分位', () => {
    expect(formatNumber(1234567, 'en-US')).toBe('1,234,567')
  })

  it('formatDate 2026-06-04', () => {
    const s = formatDate('2026-06-04T00:00:00Z', 'zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    expect(s).toMatch(/2026/)
    expect(s).toMatch(/06/)
    expect(s).toMatch(/04/)
  })

  it('relativeTime 刚刚', () => {
    const s = relativeTime(new Date(), 'zh-CN')
    expect(s).toMatch(/秒|刚刚|现在/)
  })

  it('relativeTime 5分钟前', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    const s = relativeTime(fiveMinAgo, 'zh-CN')
    expect(s).toContain('分钟')
  })
})
