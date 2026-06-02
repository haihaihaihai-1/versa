import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MerchantOnboarding } from '../components/MerchantOnboarding'

export function MerchantOnboardingPage() {
  const navigate = useNavigate()
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft className="w-4 h-4" />返回
      </button>
      <MerchantOnboarding />
    </div>
  )
}
