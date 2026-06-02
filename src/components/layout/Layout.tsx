import { Outlet, ScrollRestoration } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { MobileNav } from './MobileNav'
import { Toaster } from '../ui/Toaster'
import { useTheme } from '../../hooks/useTheme'
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts'
import { SupportWidget, SupportQuickChat } from './SupportWidget'
import { PageTransition } from './PageTransition'
import { ErrorBoundary } from '../ErrorBoundary'
import { SkipLink } from '../a11y/SkipLink'
import { KeyboardShortcutsHelp } from '../a11y/KeyboardShortcutsHelp'
import { KeyboardHelpButton } from '../a11y/KeyboardHelpButton'
import { OfflineBanner } from '../OfflineBanner'
import { CompareFloatingBar } from '../CompareFloatingBar'
import { AIFloatingButton } from '../ai/AIFloatingButton'
import { PROMPTS } from '../../data/prompts'
import { PWAStatus } from '../PWAStatus'
import { CommandPalette } from '../CommandPalette'
import { LiveCountdownBanner } from '../LiveCountdownBanner'
import { ScrollProgress } from '../ScrollProgress'
import { ConfettiHost } from '../Confetti'

export function Layout() {
  useTheme()
  const { helpOpen, setHelpOpen } = useGlobalShortcuts()
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollProgress />
      <OfflineBanner />
      <SkipLink />
      <LiveCountdownBanner />
      <Header />
      <main id="main-content" className="flex-1 pt-16 pb-24 md:pb-0" tabIndex={-1}>
        <ErrorBoundary>
          <PageTransition />
        </ErrorBoundary>
      </main>
      <Footer />
      <MobileNav />
      <SupportQuickChat />
      <SupportWidget />
      <KeyboardHelpButton />
      <CompareFloatingBar />
      <AIFloatingButton systemPrompt={PROMPTS.customerService} title="Versa AI 助手" />
      <PWAStatus />
      <CommandPalette />
      <ConfettiHost />
      <Toaster />
      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ScrollRestoration />
    </div>
  )
}
