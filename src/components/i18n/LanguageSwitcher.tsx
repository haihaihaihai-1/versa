/**
 * Versa · i18n 切换器组件 (v10.1)
 * 替代 components/i18n.tsx 里的旧 LanguageSwitcher
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check, X } from 'lucide-react'
import { SUPPORTED_LANGUAGES, LANGUAGE_META, changeLanguage, type SupportedLanguage } from '../../i18n'
import { cn } from '../../lib/utils'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = (i18n.language as SupportedLanguage) || 'zh-CN'

  const select = (l: SupportedLanguage) => {
    changeLanguage(l)
    setOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-2.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 flex items-center gap-1.5 transition"
        title="Language"
        aria-label="Language switcher"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm">{LANGUAGE_META[current]?.flag}</span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-xl z-50 overflow-hidden">
            {SUPPORTED_LANGUAGES.map((k) => (
              <button
                key={k}
                onClick={() => select(k)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-ink-100 dark:hover:bg-ink-800',
                  current === k && 'bg-nova-50 dark:bg-nova-900/30 text-nova-600'
                )}
              >
                <span className="text-lg">{LANGUAGE_META[k].flag}</span>
                <span className="flex-1">{LANGUAGE_META[k].label}</span>
                {current === k && <Check className="w-4 h-4 text-nova-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export { X as CloseIcon }
