import { Outlet, ScrollRestoration } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { MobileNav } from './MobileNav'
import { Toaster } from '../ui/Toaster'
import { useTheme } from '../../hooks/useTheme'
import { SupportWidget, SupportQuickChat } from './SupportWidget'

export function Layout() {
  useTheme()
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16 pb-24 md:pb-0">
        <Outlet />
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
