import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './App'
import { AuthProvider } from './api/AuthContext'
import { registerPWA } from './pwa'
import { OfflineIndicator, PwaInstallBanner, PwaUpdatePrompt } from './pwa/components'
import './i18n'
import './index.css'

registerPWA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <OfflineIndicator />
      <RouterProvider router={router} />
      <PwaInstallBanner />
      <PwaUpdatePrompt />
    </AuthProvider>
  </StrictMode>
)
