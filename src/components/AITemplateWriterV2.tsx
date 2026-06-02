import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, FileText, Tag, Edit3, Copy, RefreshCw, Check, Star } from 'lucide-react'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'
import { AIErrorBanner, AIIndicator } from './ai/AIIndicator'

interface Template {
  id: string
  name: string
  icon: any
  description: string
  fields: { key: string; label: string; placeholder: string; multiline?: boolean }[]
  buildPrompt: (values: Record<string, string>) => string
}

const TEMPLATES: Template[] = [
  {
    id: 'review', name: '商品评价', icon: Star, description: '生成有血有肉的商品评价',
    fields: [
      { key: 'product', label: '商品名称', placeholder: 'iPhone 16 Pro Max' },
      { key: 'highlights', label: '主要优点', placeholder: '外观好看, 续航不错, 拍照清晰', multiline: true },
      { key: 'rating', label: '评分 (1-5)', placeholder: '5' },
    ],
    buildPrompt: (v) => `请为商品"${v.product}"写一条真实感强的评价, 优点: ${v.highlights}, 评分 ${v.rating}/5, 100-200 字, 像真人写的, 不要 AI 腔`,
  },
  {
    id: 'live', name: '直播脚本', icon: Tag, description: '生成直播开场/产品介绍/收尾',
    fields: [
      { key: 'product', label: '主推商品', placeholder: '护肤品套装' },
      { key: 'price', label: '直播价', placeholder: '299' },
      { key: 'highlights', label: '核心卖点', placeholder: '抗老 保湿 敏感肌可用', multiline: true },
    ],
    buildPrompt: (v) => `为直播商品"${v.product}"写一段 3 分钟直播脚本 (价格 ¥${v.price}, 卖点: ${v.highlights}), 包含开场互动、产品演示、限时优惠倒计时、催单话术`,
  },
  {
    id: 'news', name: '资讯摘要', icon: FileText, description: '把长文摘要成 3 段',
    fields: [
      { key: 'article', label: '原文', placeholder: '粘贴一篇文章或新闻...', multiline: true },
    ],
    buildPrompt: (v) => `请把以下内容摘要成 3 段中文资讯, 每段不超过 50 字, 突出核心信息:\n${v.article}`,
  },
  {
    id: 'bio', name: '个人简介', icon: Edit3, description: '创作者主页简介',
    fields: [
      { key: 'name', label: '昵称', placeholder: '小仙女 Lily' },
      { key: 'skills', label: '专长', placeholder: '美食探店 | 烘焙 | 旅行' },
      { key: 'experience', label: '经历', placeholder: '美食博主 3 年, 探店 200+' },
    ],
    buildPrompt: (v) => `为创作者"${v.name}"写一段 50 字内的个人简介, 专长 ${v.skills}, 经历 ${v.experience}, 风格活泼有记忆点`,
  },
  {
    id: 'reply', name: '评论回复', icon: Edit3, description: '为差评/中评写专业回复',
    fields: [
      { key: 'comment', label: '用户评论', placeholder: '物流太慢, 等了 5 天才到...', multiline: true },
      { key: 'product', label: '商品', placeholder: '连衣裙' },
    ],
    buildPrompt: (v) => `用户对商品"${v.product}"留言: "${v.comment}"。请写一条专业、诚恳、解决问题的回复 (50-100 字), 不要卑微也不要机器人腔`,
  },
  {
    id: 'social', name: '动态文案', icon: Sparkles, description: '朋友圈/微博风格的种草文案',
    fields: [
      { key: 'product', label: '商品/主题', placeholder: '新买的咖啡机' },
      { key: 'mood', label: '心情/场景', placeholder: '周末阳光, 慵懒的下午' },
    ],
    buildPrompt: (v) => `为"${v.product}"写一条朋友圈风格的种草文案, 场景: ${v.mood}, 100 字内, 适当用 emoji, 像朋友分享`,
  },
]

interface AITemplateWriterV2Props {
  onUse?: (text: string) => void
  defaultTemplate?: string
}

export function AITemplateWriterV2({ onUse, defaultTemplate }: AITemplateWriterV2Props) {
  const [active, setActive] = useState<Template | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    if (!active) return
    setLoading(true)
    setOutput('')
    try {
      const result = await aiComplete(
        active.buildPrompt(values),
        '你是 Versa 创作助手, 帮用户写各种文案, 风格自然、有人情味、像真人写的, 拒绝 AI 腔'
      )
      setOutput(result)
    } catch (e: any) {
      toast(e?.message || '生成失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const copy = () => {
    navigator.clipboard?.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast('已复制', 'success')
  }

  if (!active) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-nova-500" />AI 写作模板
            <span className="text-[10px] text-ink-500">6 种</span>
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TEMPLATES.map((t) => (
            <motion.button
              key={t.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setActive(t); setValues({}); setOutput('') }}
              className="p-3 rounded-2xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 hover:border-nova-300 text-left transition"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nova-500 to-pink-500 text-white flex items-center justify-center mb-2">
                <t.icon className="w-4 h-4" />
              </div>
              <p className="font-semibold text-sm">{t.name}</p>
              <p className="text-[10px] text-ink-500 mt-0.5 line-clamp-2">{t.description}</p>
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => { setActive(null); setOutput('') }} className="text-xs text-ink-500 hover:text-nova-500">← 返回</button>
        <h3 className="font-bold flex items-center gap-1.5">
          <active.icon className="w-4 h-4 text-nova-500" />{active.name}
        </h3>
      </div>

      <div className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-3 space-y-2">
        {active.fields.map((f) => (
          <div key={f.key}>
            <label className="text-[10px] text-ink-500 mb-1 block">{f.label}</label>
            {f.multiline ? (
              <textarea
                value={values[f.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                rows={3}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500 resize-none"
              />
            ) : (
              <input
                value={values[f.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full h-9 px-3 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500"
              />
            )}
          </div>
        ))}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full h-9 rounded-lg bg-gradient-to-r from-nova-500 to-pink-500 text-white text-sm font-semibold flex items-center justify-center gap-1"
        >
          {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />生成中…</> : <><Sparkles className="w-3.5 h-3.5" />生成文案</>}
        </button>
      </div>

      {output && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-nova-50 to-pink-50 dark:from-nova-900/20 dark:to-pink-900/20 rounded-2xl p-3 border border-nova-200/40 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-ink-500 flex items-center gap-1"><Sparkles className="w-3 h-3" />生成结果</p>
            <div className="flex items-center gap-1">
              <button onClick={generate} className="p-1 hover:bg-nova-100 dark:hover:bg-nova-900/40 rounded"><RefreshCw className="w-3 h-3" /></button>
              <button onClick={copy} className="p-1 hover:bg-nova-100 dark:hover:bg-nova-900/40 rounded">
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{output}</p>
          {onUse && (
            <button
              onClick={() => onUse(output)}
              className="w-full h-8 rounded-lg bg-nova-500 text-white text-xs font-semibold"
            >
              使用此文案
            </button>
          )}
        </motion.div>
      )}
    </div>
  )
}
