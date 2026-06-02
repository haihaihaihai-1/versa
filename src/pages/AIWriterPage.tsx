import { AITemplateWriterV2 } from '../components/AITemplateWriterV2'
import { Sparkles } from 'lucide-react'

export function AIWriterPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">AI 写作</h1>
          <p className="text-sm text-ink-500">6 种模板 · 评价/回复/动态/资讯/简介/直播脚本</p>
        </div>
      </div>
      <AITemplateWriterV2 />
    </div>
  )
}
