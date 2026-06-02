import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Wand2, FileText, X, ChevronRight, Loader2, Copy, Check, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'
import { aiComplete, isAIEnabled } from '../../lib/ai'
import { toast } from '../ui/Toaster'

export interface WritingTemplate {
  id: string
  name: string
  icon: string
  description: string
  prompt: string
  fields: { key: string; label: string; placeholder: string; multiline?: boolean }[]
}

export const WRITING_TEMPLATES: WritingTemplate[] = [
  {
    id: 'review',
    name: '商品评价',
    icon: '⭐',
    description: '基于商品信息生成真实感的评价',
    prompt: '以真实用户身份写一条商品评价,语气自然,使用{{tone}}风格,长度{{length}},包含{{highlights}}。商品: {{product}}。给出 3 个不同角度的版本,分别标记 [好评/中评/差评]。',
    fields: [
      { key: 'product', label: '商品名称', placeholder: '如: iPhone 16 Pro' },
      { key: 'highlights', label: '重点关注', placeholder: '如: 拍照/电池/手感', multiline: true },
      { key: 'tone', label: '语气', placeholder: '活泼 / 专业 / 文艺' },
      { key: 'length', label: '长度', placeholder: '简短 / 适中 / 详细' },
    ],
  },
  {
    id: 'reply',
    name: '回复评论',
    icon: '💬',
    description: '智能生成得体的评论回复',
    prompt: '请为以下评论写一条友好的回复,使用{{tone}}语气,长度{{length}}。\n\n评论: {{comment}}',
    fields: [
      { key: 'comment', label: '收到的评论', placeholder: '输入要回复的评论内容', multiline: true },
      { key: 'tone', label: '回复语气', placeholder: '幽默 / 礼貌 / 专业' },
      { key: 'length', label: '长度', placeholder: '简短 / 适中' },
    ],
  },
  {
    id: 'post',
    name: '动态文案',
    icon: '📱',
    description: '适合社交媒体的短文案',
    prompt: '为商品/活动写{{count}}条社交媒体短文案,每条不超过50字,使用{{tone}}语气,带 1-2 个相关 emoji。主题: {{topic}}',
    fields: [
      { key: 'topic', label: '主题', placeholder: '如: 618 数码推荐' },
      { key: 'tone', label: '语气', placeholder: '活泼 / 简洁 / 文艺' },
      { key: 'count', label: '数量', placeholder: '3 / 5 / 10' },
    ],
  },
  {
    id: 'news',
    name: '资讯摘要',
    icon: '📰',
    description: '长文一键摘要 3 段式',
    prompt: '请对以下内容做 3 段式摘要:\n1. 核心事实 (50字内)\n2. 关键背景 (80字内)\n3. 网友观点 (50字内)\n\n原文: {{content}}',
    fields: [
      { key: 'content', label: '原文', placeholder: '粘贴新闻全文', multiline: true },
    ],
  },
  {
    id: 'debate',
    name: '辩论观点',
    icon: '⚖️',
    description: '生成正反两方观点',
    prompt: '针对辩题「{{topic}}」生成{{rounds}}组正反方观点,每组 3 条,使用{{tone}}风格。要求:\n- 正方: {{pro}} 角度\n- 反方: {{con}} 角度',
    fields: [
      { key: 'topic', label: '辩题', placeholder: '如: 直播带货是否促进消费' },
      { key: 'pro', label: '正方关键词', placeholder: '如: 便利/价格' },
      { key: 'con', label: '反方关键词', placeholder: '如: 冲动消费/质量' },
      { key: 'rounds', label: '轮数', placeholder: '2 / 3 / 5' },
      { key: 'tone', label: '风格', placeholder: '正式 / 犀利 / 学术' },
    ],
  },
  {
    id: 'product',
    name: '商品文案',
    icon: '🛍️',
    description: '生成商品营销文案',
    prompt: '为商品「{{product}}」生成 3 种营销文案:\n1. 标题 (15字内,吸睛)\n2. 卖点 (3点,各 20字)\n3. 场景描述 (100字内,使用{{tone}}语气)',
    fields: [
      { key: 'product', label: '商品', placeholder: '如: 降噪耳机' },
      { key: 'tone', label: '语气', placeholder: '专业 / 趣味 / 情感' },
    ],
  },
]

interface Props {
  onUse?: (text: string) => void
  className?: string
}

export function AITemplateWriter({ onUse, className }: Props) {
  const [open, setOpen] = useState(false)
  const [template, setTemplate] = useState<WritingTemplate | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const close = () => {
    setOpen(false)
    setTemplate(null)
    setValues({})
    setResult('')
  }

  const generate = async () => {
    if (!template) return
    if (!isAIEnabled()) {
      toast('请先配置 VITE_MIMO_API_KEY', 'info')
      return
    }
    setLoading(true)
    setResult('')
    try {
      let prompt = template.prompt
      Object.entries(values).forEach(([k, v]) => {
        prompt = prompt.replace(new RegExp(`{{${k}}}`, 'g'), v || `[${template.fields.find((f) => f.key === k)?.label || k}]`)
      })
      const text = await aiComplete(prompt, '你是 Versa 创作助手,擅长各种内容创作。', { maxTokens: 800, temperature: 0.8 })
      setResult(text)
    } catch (e) {
      toast('生成失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      toast('已复制', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-gradient-to-r from-nova-500 to-pink-500 text-white text-sm font-semibold shadow-lg hover:scale-105 transition',
          className
        )}
      >
        <Wand2 className="w-4 h-4" />
        AI 写作模板
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4"
            onClick={close}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-ink-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-nova-500" />
                  AI 写作模板
                </h2>
                <button onClick={close} className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!template ? (
                <div className="p-6 overflow-y-auto">
                  <p className="text-sm text-ink-500 mb-4">选择模板,填入信息,一键生成专业文案</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {WRITING_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTemplate(t)
                          setValues({})
                          setResult('')
                        }}
                        className="text-left p-4 rounded-2xl border border-ink-200 dark:border-ink-700 hover:border-nova-500 hover:shadow-lg transition"
                      >
                        <div className="text-2xl mb-2">{t.icon}</div>
                        <h3 className="font-bold">{t.name}</h3>
                        <p className="text-xs text-ink-500 mt-1">{t.description}</p>
                        <div className="mt-2 inline-flex items-center gap-1 text-xs text-nova-500">
                          使用 <ChevronRight className="w-3 h-3" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 overflow-y-auto flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <button onClick={() => setTemplate(null)} className="text-xs text-ink-500 hover:text-nova-500">← 返回模板</button>
                      <span className="text-2xl">{template.icon}</span>
                      <h3 className="font-bold">{template.name}</h3>
                    </div>
                    <div className="space-y-3">
                      {template.fields.map((f) => (
                        <div key={f.key}>
                          <label className="text-xs font-medium text-ink-500 mb-1 block">{f.label}</label>
                          {f.multiline ? (
                            <textarea
                              value={values[f.key] || ''}
                              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              rows={3}
                              className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500"
                            />
                          ) : (
                            <input
                              value={values[f.key] || ''}
                              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={generate}
                      disabled={loading}
                      className="mt-4 w-full px-4 h-11 rounded-xl bg-gradient-to-r from-nova-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 生成中...</> : <><Wand2 className="w-4 h-4" /> 生成</>}
                    </button>

                    {result && (
                      <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-nova-50 to-pink-50 dark:from-nova-950/30 dark:to-pink-950/30 border border-nova-200/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-nova-600 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> 生成结果
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={generate}
                              className="p-1.5 hover:bg-white/50 rounded"
                              title="重新生成"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCopy}
                              className="p-1.5 hover:bg-white/50 rounded"
                              title="复制"
                            >
                              {copied ? <Check className="w-3.5 h-3.5 text-shop-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            {onUse && (
                              <button
                                onClick={() => { onUse(result); close() }}
                                className="p-1.5 hover:bg-white/50 rounded text-xs"
                                title="使用"
                              >
                                使用
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{result}</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
