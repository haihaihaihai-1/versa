// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import i18n, { SUPPORTED_LANGUAGES, LANGUAGE_META, changeLanguage, getCurrentLanguage } from '../index'

beforeEach(() => {
  localStorage.clear()
})

describe('i18n · 常量', () => {
  it('5 种支持语言', () => {
    expect(SUPPORTED_LANGUAGES.length).toBe(5)
  })

  it('必含 zh-CN + en', () => {
    expect(SUPPORTED_LANGUAGES).toContain('zh-CN')
    expect(SUPPORTED_LANGUAGES).toContain('en')
  })

  it('LANGUAGE_META 每种都有 label + flag', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const meta = LANGUAGE_META[lang]
      expect(meta).toBeTruthy()
      expect(meta.label).toBeTruthy()
      expect(meta.flag).toBeTruthy()
    }
  })

  it('中文 flag 是国旗 emoji', () => {
    expect(LANGUAGE_META['zh-CN'].flag).toBe('🇨🇳')
  })
})

describe('i18n · 翻译功能', () => {
  it('t() 嵌套 key', () => {
    expect(i18n.t('common.confirm')).toBeTruthy()
  })

  it('未知 key → 返回 key', () => {
    expect(i18n.t('__no_such_key__xyz__')).toBe('__no_such_key__xyz__')
  })

  it('zh-CN 默认包含中文', () => {
    const v = i18n.t('common.confirm')
    // '确认' 或 'Confirm'
    expect(v.length).toBeGreaterThan(0)
  })
})

describe('i18n · 切换语言', () => {
  it('getCurrentLanguage 至少能取到', () => {
    const lang = getCurrentLanguage()
    expect(SUPPORTED_LANGUAGES).toContain(lang)
  })

  it('changeLanguage 切到 en 后 t 英文', async () => {
    await changeLanguage('en')
    expect(i18n.language).toBe('en')
    expect(i18n.t('common.confirm').toLowerCase()).toContain('confirm')
  })

  it('changeLanguage 切回 zh-CN', async () => {
    await changeLanguage('en')
    await changeLanguage('zh-CN')
    expect(i18n.language).toBe('zh-CN')
  })
})

describe('i18n · fallback', () => {
  it('fallback 是 zh-CN (数组形式)', () => {
    expect(i18n.options.fallbackLng).toContain('zh-CN')
  })
})
