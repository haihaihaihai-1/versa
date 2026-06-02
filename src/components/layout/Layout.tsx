import { Outlet, ScrollRestoration } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { MobileNav } from './MobileNav'
import { Toaster } from '../ui/Toaster'
import { useTheme } from '../../hooks/useTheme'
import { SupportWidget, SupportQuickChat } from './SupportWidget'
import { PageTransition } from './PageTransition'
import { ErrorBoundary } from '../ErrorBoundary'
import { SkipLink } from '../a11y/SkipLink'

export function Layout() {
  useTheme()
  return (
    <div className="min-h-screen flex flex-col">
      <SkipLink />
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
      <Toaster />
      <ScrollRestoration />
    </div>
  )
}
