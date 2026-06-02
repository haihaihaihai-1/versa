import { ThemeBuilder } from '../components/ThemeBuilder'
import { Palette } from 'lucide-react'

export function ThemeBuilderPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Palette className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">主题定制</h1>
          <p className="text-sm text-ink-500">自定义主色/字体/圆角, 实时预览</p>
        </div>
      </div>
      <ThemeBuilder />
    </div>
  )
}
