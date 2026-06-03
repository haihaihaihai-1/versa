import { useState } from 'react'
import { Library, GitCompare, Hash, Activity, FileText, Image as ImageIcon, MessageSquare, Wand2, Brain } from 'lucide-react'
import { cn } from '../lib/utils'
import { PromptLibrary } from '../components/PromptLibrary'
import { ModelCompare } from '../components/ModelCompare'
import { TokenCounter } from '../components/TokenCounter'
import { SentimentAnalyzer } from '../components/SentimentAnalyzer'
import { TextSummarizer } from '../components/TextSummarizer'
import { AIImageGallery } from '../components/AIImageGallery'
import { ConversationLog } from '../components/ConversationLog'
import { PromptImprover } from '../components/PromptImprover'

const TABS = [
  { id: 'prompts', label: '提示词库', icon: Library, color: 'from-blue-500 to-cyan-500' },
  { id: 'models', label: '模型对比', icon: GitCompare, color: 'from-violet-500 to-purple-500' },
  { id: 'tokens', label: 'Token 计算', icon: Hash, color: 'from-cyan-500 to-blue-500' },
  { id: 'sentiment', label: '情感分析', icon: Activity, color: 'from-pink-500 to-rose-500' },
  { id: 'summary', label: '文本总结', icon: FileText, color: 'from-emerald-500 to-teal-500' },
  { id: 'gallery', label: 'AI 图像', icon: ImageIcon, color: 'from-fuchsia-500 to-pink-500' },
  { id: 'chat', label: '对话日志', icon: MessageSquare, color: 'from-violet-500 to-fuchsia-500' },
  { id: 'improve', label: 'Prompt 改进', icon: Wand2, color: 'from-amber-500 to-orange-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function AIHub() {
  const [tab, setTab] = useState<TabId>('prompts')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5" />
          <h1 className="text-xl font-bold">AI 实验场</h1>
        </div>
        <p className="text-xs opacity-90">提示词 · 模型 · Token · 情感 · 总结 · 图像 · 对话 · 改进</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all',
                tab === t.id
                  ? `bg-gradient-to-br ${t.color} text-white shadow-lg scale-105`
                  : 'bg-white/60 dark:bg-ink-900/30 text-ink-700 dark:text-ink-300'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          )
        })}
      </div>

      <div>
        {tab === 'prompts' && <PromptLibrary />}
        {tab === 'models' && <ModelCompare />}
        {tab === 'tokens' && <TokenCounter />}
        {tab === 'sentiment' && <SentimentAnalyzer />}
        {tab === 'summary' && <TextSummarizer />}
        {tab === 'gallery' && <AIImageGallery />}
        {tab === 'chat' && <ConversationLog />}
        {tab === 'improve' && <PromptImprover />}
      </div>
    </div>
  )
}
