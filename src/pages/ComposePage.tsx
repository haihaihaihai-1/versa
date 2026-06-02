// ============== 发帖页 ==============

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image as ImageIcon, BarChart3, X, Hash, AtSign, Newspaper, Scale, ShoppingBag, Sparkles, Wand2, Loader2, Check } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import { UserAvatar } from '../components/social/UserAvatar'
import api from '../api'
import { cn } from '../lib/utils'
import { useAI } from '../hooks/useAI'
import { PROMPTS } from '../data/prompts'
import { AIBadge, AIErrorBanner, AIIndicator } from '../components/ai/AIIndicator'
import type { Post } from '../api/types'

const TYPES = [
  { key: 'text', label: '纯文字', icon: Sparkles },
  { key: 'image', label: '图片', icon: ImageIcon },
  { key: 'poll', label: '投票', icon: BarChart3 },
] as const

const MODULE_OPTIONS = [
  { key: 'none', label: '无关联', icon: Sparkles, color: 'from-ink-400 to-ink-500' },
  { key: 'news', label: '关联资讯', icon: Newspaper, color: 'from-amber-500 to-orange-500' },
  { key: 'debate', label: '关联辩题', icon: Scale, color: 'from-rose-500 to-pink-500' },
  { key: 'shop', label: '关联商品', icon: ShoppingBag, color: 'from-emerald-500 to-teal-500' },
] as const

export function ComposePage() {
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const [type, setType] = useState<'text' | 'image' | 'poll'>('text')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [hashtags, setHashtags] = useState('')
  const [refType, setRefType] = useState<'none' | 'news' | 'debate' | 'shop'>('none')
  const [refId, setRefId] = useState<string>('')
  const [poll, setPoll] = useState({ question: '', options: ['', ''] })
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ai = useAI()
  const [aiSuggest, setAiSuggest] = useState<{ style: string; text: string }[]>([])
  const [showAiModal, setShowAiModal] = useState(false)

  if (!me) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold mb-2">请先登录</h2>
        <button onClick={() => navigate('/auth')} className="text-nova-600 hover:underline">去登录</button>
      </div>
    )
  }

  const news = api.modules.news()
  const debates = api.modules.debates()
  const products = api.modules.products()

  const onImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4 - images.length)
    files.forEach((f) => {
      const reader = new FileReader()
      reader.onload = () => {
        setImages((arr) => [...arr, reader.result as string].slice(0, 4))
      }
      reader.readAsDataURL(f)
    })
  }

  const addPollOption = () => {
    if (poll.options.length < 6) setPoll({ ...poll, options: [...poll.options, ''] })
  }
  const removePollOption = (i: number) => {
    if (poll.options.length > 2) setPoll({ ...poll, options: poll.options.filter((_, idx) => idx !== i) })
  }

  const submit = async () => {
    if (!content.trim() && type !== 'image' && type !== 'poll') return
    if (type === 'poll' && (!poll.question.trim() || poll.options.filter((o) => o.trim()).length < 2)) {
      alert('请填写投票问题和至少 2 个选项')
      return
    }
    setSubmitting(true)
    const tagList = hashtags.split(/[\s,#]+/).filter((t) => t.length > 0).map((t) => (t.startsWith('#') ? t : '#' + t))
    const post = api.posts.create({
      authorId: me.id,
      type,
      content: content.trim() || (type === 'poll' ? poll.question : '分享了一张图片'),
      images: type === 'image' ? images : [],
      hashtags: tagList,
      refType,
      refId: refType === 'none' ? undefined : refId,
      poll: type === 'poll' ? {
        question: poll.question,
        options: poll.options.filter((o) => o.trim()).map((text, i) => ({ id: `opt_${i}`, text, votes: [] })),
      } : undefined,
    })
    navigate(`/p/${post.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ink-100 dark:border-ink-800">
          <button onClick={() => navigate(-1)} className="text-sm text-ink-500 hover:text-ink-900">取消</button>
          <h2 className="font-semibold">发布动态</h2>
          <button
            onClick={submit}
            disabled={submitting || (!content.trim() && type === 'text')}
            className="px-4 py-1.5 rounded-full bg-nova-500 hover:bg-nova-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {submitting ? '发布中...' : '发布'}
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <UserAvatar user={me} size="md" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{me.displayName}</div>
              <div className="text-xs text-ink-500">@{me.username}</div>
            </div>
          </div>

          {/* Type selector */}
          <div className="flex gap-2 mb-4">
            {TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  type === t.key ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300'
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 2000))}
            placeholder={type === 'text' ? '说点什么吧...' : type === 'image' ? '为你的图片配文...' : '补充描述...'}
            rows={6}
            className="w-full text-lg outline-none resize-none bg-transparent placeholder:text-ink-400"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={async () => {
                if (!content.trim() || ai.loading) return
                setShowAiModal(true)
                setAiSuggest([])
                const result = await ai.stream(`主题/草稿：${content}`, PROMPTS.composeAssistant, { temperature: 0.8 })
                if (result) {
                  // Parse 3 styles
                  const sections = result.split(/===\s*([^=]+)\s*===/).filter((s) => s.trim())
                  const parsed: { style: string; text: string }[] = []
                  for (let i = 0; i < sections.length; i += 2) {
                    const style = sections[i]?.trim()
                    const text = sections[i + 1]?.trim()
                    if (style && text) parsed.push({ style, text })
                  }
                  setAiSuggest(parsed.length ? parsed : [{ style: 'AI 润色', text: result }])
                }
              }}
              disabled={!content.trim() || ai.loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-nova-500/15 to-purple-500/15 text-nova-600 dark:text-nova-300 hover:from-nova-500/25 hover:to-purple-500/25 disabled:opacity-50 transition"
            >
              {ai.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              AI 帮我润色
              <AIBadge className="ml-1" />
            </button>
            <div className="text-xs text-ink-400">{content.length} / 2000</div>
          </div>

          {/* Images */}
          {type === 'image' && (
            <div className="mt-4">
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onImageUpload} className="hidden" />
              {images.length === 0 ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 rounded-2xl border-2 border-dashed border-ink-300 dark:border-ink-700 hover:border-nova-500 flex flex-col items-center justify-center gap-2 text-ink-500 transition-colors"
                >
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-sm">点击上传图片（最多 4 张）</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-ink-100">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImages((arr) => arr.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {images.length < 4 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-ink-300 hover:border-nova-500 flex items-center justify-center text-ink-500"
                    >
                      <ImageIcon className="w-6 h-6" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Poll */}
          {type === 'poll' && (
            <div className="mt-4 p-4 rounded-xl border border-ink-200 dark:border-ink-800 bg-ink-50/50 dark:bg-ink-800/30">
              <label className="text-sm font-medium block mb-2">投票问题</label>
              <input
                type="text"
                value={poll.question}
                onChange={(e) => setPoll({ ...poll, question: e.target.value })}
                placeholder="你想问什么？"
                className="w-full px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 mb-3"
              />
              <label className="text-sm font-medium block mb-2">选项（2-6 个）</label>
              <div className="space-y-2">
                {poll.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-nova-100 dark:bg-nova-900/30 text-nova-600 text-xs flex items-center justify-center font-medium">{i + 1}</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => setPoll({ ...poll, options: poll.options.map((o, idx) => idx === i ? e.target.value : o) })}
                      placeholder={`选项 ${i + 1}`}
                      className="flex-1 px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900"
                    />
                    {poll.options.length > 2 && (
                      <button onClick={() => removePollOption(i)} className="p-1.5 text-ink-400 hover:text-debate-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {poll.options.length < 6 && (
                <button onClick={addPollOption} className="mt-2 text-sm text-nova-600 hover:underline">+ 添加选项</button>
              )}
            </div>
          )}

          {/* Module association */}
          <div className="mt-4 p-4 rounded-xl border border-ink-200 dark:border-ink-800 bg-ink-50/30 dark:bg-ink-800/20">
            <label className="text-sm font-medium block mb-2">关联模块（可选）</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {MODULE_OPTIONS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => { setRefType(m.key); setRefId('') }}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-colors',
                    refType === m.key ? 'border-nova-500 bg-nova-50 dark:bg-nova-900/30' : 'border-ink-200 dark:border-ink-800'
                  )}
                >
                  <div className={cn('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white', m.color)}>
                    <m.icon className="w-3.5 h-3.5" />
                  </div>
                  {m.label}
                </button>
              ))}
            </div>
            {refType !== 'none' && (
              <select
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-sm"
              >
                <option value="">-- 选择关联内容 --</option>
                {refType === 'news' && news.map((n: any) => <option key={n.id} value={n.id}>{n.title}</option>)}
                {refType === 'debate' && debates.map((d: any) => <option key={d.id} value={d.id}>{d.title}</option>)}
                {refType === 'shop' && products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>

          {/* Hashtags */}
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl border border-ink-200 dark:border-ink-800">
            <Hash className="w-4 h-4 text-ink-400" />
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="话题（用空格或逗号分隔）"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>
      </div>

      {/* AI Assist Modal */}
      {showAiModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAiModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white dark:bg-ink-900 shadow-2xl"
          >
            <div className="sticky top-0 bg-gradient-to-r from-nova-500 to-purple-500 text-white p-5 flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                <div>
                  <h3 className="font-bold">AI 润色建议</h3>
                  <p className="text-[10px] text-white/80">3 种风格任你选</p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="p-1 rounded-full hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {ai.error && <AIErrorBanner message={ai.error} />}

              {aiSuggest.length === 0 ? (
                <div className="py-12 text-center">
                  <AIIndicator loading text="AI 正在创作 3 个版本…" className="mx-auto" />
                </div>
              ) : (
                aiSuggest.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-ink-200 dark:border-ink-800 p-4 hover:border-nova-500 transition group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-nova-500 to-purple-500 text-white">
                        {s.style}
                      </span>
                      <button
                        onClick={() => {
                          setContent(s.text)
                          setShowAiModal(false)
                        }}
                        className="text-xs text-nova-500 hover:underline inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Check className="w-3 h-3" />
                        采用此版本
                      </button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{s.text}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(s.text)}
                      className="mt-2 text-[10px] text-ink-400 hover:text-nova-500"
                    >
                      复制
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
