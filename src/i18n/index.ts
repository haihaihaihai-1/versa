/**
 * Versa · i18n 配置 (v10.1)
 * 基于 i18next + react-i18next + browser-languagedetector
 *
 * 用法：
 *   import { useTranslation } from 'react-i18next'
 *   const { t } = useTranslation()
 *   <h1>{t('nav.home')}</h1>
 *
 *   <h1>{t('shop.lowStock', { count: 5 })}</h1>
 *
 * 语言切换：
 *   import { changeLanguage, SUPPORTED_LANGUAGES } from '@/i18n'
 *   changeLanguage('en')
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'

export const SUPPORTED_LANGUAGES = ['zh-CN', 'en', 'zh-TW', 'ja', 'ko'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_META: Record<SupportedLanguage, { label: string; flag: string; rtl?: boolean }> = {
  'zh-CN': { label: '简体中文', flag: '🇨🇳' },
  'zh-TW': { label: '繁體中文', flag: '🇭🇰' },
  en: { label: 'English', flag: '🇺🇸' },
  ja: { label: '日本語', flag: '🇯🇵' },
  ko: { label: '한국어', flag: '🇰🇷' },
}

const STORAGE_KEY = 'versa:lang'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'zh-CN',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    resources: {
      'zh-CN': { translation: zhCN },
      en: { translation: en },
      'zh-TW': { translation: zhCN }, // 暂时用简体, 后续 PR 翻译
      ja: { translation: en },         // 暂时用英文, 后续 PR 翻译
      ko: { translation: en },         // 暂时用英文, 后续 PR 翻译
    },
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  })

export function changeLanguage(lang: SupportedLanguage) {
  return i18n.changeLanguage(lang)
}

export function getCurrentLanguage(): SupportedLanguage {
  return (i18n.language as SupportedLanguage) || 'zh-CN'
}

export default i18n
