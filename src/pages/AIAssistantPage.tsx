import { VersaAssistantPanel } from '../components/ai/VersaAssistantPanel'

export function AIAssistantPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:from-ink-950 dark:via-ink-900 dark:to-violet-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Versa AI
          </h1>
          <p className="text-sm text-ink-500 mt-1">5 大 AI 能力,本地模式零成本,接 OpenAI/Claude/Qwen 一键切换</p>
        </header>
        <div className="h-[640px]">
          <VersaAssistantPanel />
        </div>
      </div>
    </div>
  )
}
