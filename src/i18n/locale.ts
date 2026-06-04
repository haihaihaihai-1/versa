/**
 * Versa · 日期 / 数字 / 货币本地化 (v10.1)
 * 提供纯函数 + hook 两种调用方式
 */
import { useTranslation } from 'react-i18next'

export function useLocale() {
  const { i18n } = useTranslation()
  return {
    lang: i18n.language,
    locale: langToBCP47(i18n.language),
    isCJK: ['zh-CN', 'zh-TW', 'ja', 'ko'].includes(i18n.language),
  }
}

export function langToBCP47(lang: string): string {
  switch (lang) {
    case 'zh-CN': return 'zh-CN'
    case 'zh-TW': return 'zh-Hant'
    case 'en': return 'en-US'
    case 'ja': return 'ja-JP'
    case 'ko': return 'ko-KR'
    default: return lang
  }
}

export function formatCurrency(amount: number, currency: string = 'CNY', locale: string = 'zh-CN'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string | Date, locale: string = 'zh-CN', opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, opts ?? { year: 'numeric', month: 'short', day: 'numeric' }).format(d)
}

export function formatNumber(n: number, locale: string = 'zh-CN', opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, opts).format(n)
}

export function relativeTime(date: string | Date, locale: string = 'zh-CN'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (sec < 60) return rtf.format(-sec, 'second')
  if (min < 60) return rtf.format(-min, 'minute')
  if (hr < 24) return rtf.format(-hr, 'hour')
  if (day < 30) return rtf.format(-day, 'day')
  const month = Math.floor(day / 30)
  if (month < 12) return rtf.format(-month, 'month')
  const year = Math.floor(day / 365)
  return rtf.format(-year, 'year')
}
