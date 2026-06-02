import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts'
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp'

export function KeyboardHelpButton() {
  // This component uses its own state to avoid coupling with the global layout one
  const [open, setOpen] = useState(false)
  // Listen for ? key globally
  useGlobalShortcuts()
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-30 md:bottom-4 w-10 h-10 rounded-full bg-white dark:bg-ink-800 shadow-lg border border-ink-200 dark:border-ink-700 flex items-center justify-center text-ink-600 dark:text-ink-300 hover:bg-nova-50 dark:hover:bg-nova-900/30 hover:text-nova-600 dark:hover:text-nova-400 transition-colors"
        aria-label="键盘快捷键帮助"
        title="键盘快捷键 (?)"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
      <KeyboardShortcutsHelp open={open} onClose={() => setOpen(false)} />
    </>
  )
}
