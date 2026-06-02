import { useState, useEffect } from 'react'
import { motion, Reorder } from 'framer-motion'
import { LayoutDashboard, Plus, Trash2, GripVertical, Eye, EyeOff, Save, RotateCcw, Sparkles, Loader2, Calendar, TrendingUp, Heart, MessageCircle, ShoppingCart, Users, BarChart3, DollarSign, Cloud, Bell } from 'lucide-react'
import { cn, uid, formatNumber } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

type WidgetType = 'stats' | 'chart' | 'feed' | 'cart' | 'social' | 'goals' | 'weather' | 'notifications' | 'quote' | 'tasks'

interface Widget {
  id: string
  type: WidgetType
  title: string
  size: 'sm' | 'md' | 'lg'
  visible: boolean
  config?: any
}

const STORAGE_KEY = 'versa:dashboard'

function defaultWidgets(): Widget[] {
  return [
    { id: 'w1', type: 'stats', title: '核心数据', size: 'lg', visible: true },
    { id: 'w2', type: 'chart', title: '本周趋势', size: 'md', visible: true },
    { id: 'w3', type: 'goals', title: '我的目标', size: 'md', visible: true },
    { id: 'w4', type: 'weather', title: '今日天气', size: 'sm', visible: true },
    { id: 'w5', type: 'feed', title: '最新动态', size: 'md', visible: true },
    { id: 'w6', type: 'cart', title: '购物车', size: 'sm', visible: true },
    { id: 'w7', type: 'social', title: '社交统计', size: 'sm', visible: true },
    { id: 'w8', type: 'tasks', title: '待办', size: 'md', visible: true },
    { id: 'w9', type: 'notifications', title: '通知', size: 'sm', visible: false },
    { id: 'w10', type: 'quote', title: '每日一言', size: 'sm', visible: true },
  ]
}

function load(): Widget[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return defaultWidgets() }
function save(d: Widget[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const TYPE_META: Record<WidgetType, { label: string; icon: any; emoji: string; color: string }> = {
  stats: { label: '核心数据', icon: BarChart3, emoji: '📊', color: 'from-violet-500 to-purple-500' },
  chart: { label: '趋势图', icon: TrendingUp, emoji: '📈', color: 'from-blue-500 to-indigo-500' },
  feed: { label: '最新动态', icon: MessageCircle, emoji: '💬', color: 'from-rose-500 to-pink-500' },
  cart: { label: '购物车', icon: ShoppingCart, emoji: '🛒', color: 'from-amber-500 to-orange-500' },
  social: { label: '社交', icon: Users, emoji: '👥', color: 'from-emerald-500 to-teal-500' },
  goals: { label: '目标', icon: Sparkles, emoji: '🎯', color: 'from-amber-500 to-yellow-500' },
  weather: { label: '天气', icon: Cloud, emoji: '☁️', color: 'from-cyan-500 to-blue-500' },
  notifications: { label: '通知', icon: Bell, emoji: '🔔', color: 'from-rose-500 to-red-500' },
  quote: { label: '每日一言', icon: Sparkles, emoji: '💭', color: 'from-violet-500 to-fuchsia-500' },
  tasks: { label: '待办', icon: Calendar, emoji: '✅', color: 'from-emerald-500 to-teal-500' },
}

const SIZES: Record<Widget['size'], string> = {
  sm: 'col-span-1',
  md: 'col-span-1 sm:col-span-2',
  lg: 'col-span-1 sm:col-span-3',
}

export function DashboardBuilder() {
  const [widgets, setWidgets] = useState<Widget[]>(load())
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [aiLayout, setAiLayout] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(widgets) }, [widgets])

  const toggleVisible = (id: string) => setWidgets((ws) => ws.map((w) => w.id === id ? { ...w, visible: !w.visible } : w))
  const removeWidget = (id: string) => setWidgets((ws) => ws.filter((w) => w.id !== id))
  const addWidget = (type: WidgetType) => {
    const Meta = TYPE_META[type]
    const w: Widget = { id: uid(), type, title: Meta.label, size: 'md', visible: true }
    setWidgets([...widgets, w])
    setAdding(false)
    toast('已添加', 'success')
  }
  const reset = () => { setWidgets(defaultWidgets()); toast('已重置', 'info') }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为 Versa 用户推荐 5 个最实用的小组件 (50-80 字)', '你是 Versa UI 设计师, 简洁专业, 中文')
      setAiLayout(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const renderWidget = (w: Widget) => {
    if (!w.visible) return null
    switch (w.type) {
      case 'stats':
        return (
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { l: '粉丝', v: '15.2k', c: 'text-violet-500' },
              { l: '获赞', v: '8.4k', c: 'text-rose-500' },
              { l: '订单', v: '328', c: 'text-emerald-500' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <p className={cn('text-lg font-bold', s.c)}>{s.v}</p>
                <p className="text-[9px] text-ink-500">{s.l}</p>
              </div>
            ))}
          </div>
        )
      case 'chart':
        return (
          <div className="flex items-end gap-0.5 h-12">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-cyan-500" style={{ height: `${h}%` }} />
            ))}
          </div>
        )
      case 'feed':
        return (
          <div className="space-y-1">
            {['美食家 Lily 发布了新菜谱', '数码小王子 开播了', '购物达人王 关注了你'].map((t, i) => (
              <p key={i} className="text-[10px] truncate">· {t}</p>
            ))}
          </div>
        )
      case 'cart':
        return <p className="text-xs">购物车里 3 件商品, 共 ¥1280</p>
      case 'social':
        return (
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div>关注 286</div>
            <div>粉丝 15.2k</div>
            <div>获赞 8.4k</div>
            <div>评论 1.2k</div>
          </div>
        )
      case 'goals':
        return (
          <div className="space-y-1">
            {[
              { l: '本月直播 20h', p: 65 },
              { l: '涨粉 1000', p: 82 },
              { l: '作品 5 个', p: 60 },
            ].map((g) => (
              <div key={g.l}>
                <div className="flex items-center justify-between text-[9px] mb-0.5">
                  <span>{g.l}</span>
                  <span>{g.p}%</span>
                </div>
                <div className="h-1 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${g.p}%` }} />
                </div>
              </div>
            ))}
          </div>
        )
      case 'weather':
        return <div className="flex items-center gap-2"><Cloud className="w-6 h-6 text-blue-500" /><div><p className="text-sm font-bold">26° 多云</p><p className="text-[9px] text-ink-500">上海</p></div></div>
      case 'notifications':
        return <p className="text-xs">3 条新通知</p>
      case 'quote':
        return <p className="text-[10px] italic text-ink-600 dark:text-ink-400 leading-relaxed">"种一棵树最好的时间是十年前, 其次是现在。"</p>
      case 'tasks':
        return (
          <div className="space-y-0.5">
            {['发布新视频', '回复评论', '查看数据'].map((t, i) => (
              <p key={i} className="text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-ink-400" />{t}</p>
            ))}
          </div>
        )
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <LayoutDashboard className="w-5 h-5" />
          <h2 className="text-lg font-bold">自定义仪表盘</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">拖拽排序 · 显示/隐藏 · 个性化你的首页</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{widgets.length}</p>
            <p className="text-[10px] opacity-80">组件</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{widgets.filter((w) => w.visible).length}</p>
            <p className="text-[10px] opacity-80">显示</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{(Object.keys(TYPE_META) as WidgetType[]).length}</p>
            <p className="text-[10px] opacity-80">类型</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setEditing(!editing)} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', editing ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
          {editing ? '✓ 完成' : '编辑'}
        </button>
        <button onClick={() => setAdding(true)} className="px-2.5 h-8 rounded-lg bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加
        </button>
        <button onClick={runAI} disabled={loading} className="px-2.5 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI
        </button>
        <button onClick={reset} className="px-2.5 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {aiLayout && (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl p-3 border border-cyan-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-cyan-500"><Sparkles className="w-3.5 h-3.5" />AI 推荐</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiLayout}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        <Reorder.Group axis="y" values={widgets.filter((w) => w.visible)} onReorder={() => {}} className="contents">
          {widgets.map((w) => {
            const Meta = TYPE_META[w.type]
            return (
              <Reorder.Item
                key={w.id}
                value={w}
                onDragEnd={() => {
                  const visible = widgets.filter((x) => x.visible)
                  const order = visible.map((x) => x.id)
                  setWidgets((ws) => [...ws].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)))
                }}
                className={cn(SIZES[w.size], editing && 'ring-2 ring-cyan-500')}
              >
                <div className={cn('rounded-2xl p-2.5 border', w.visible ? 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60' : 'bg-ink-50/30 dark:bg-ink-900/10 border-ink-200/30 opacity-50')}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {editing && <GripVertical className="w-3 h-3 text-ink-400" />}
                    <div className={cn('w-5 h-5 rounded bg-gradient-to-br flex items-center justify-center text-[10px]', Meta.color)}>
                      {Meta.emoji}
                    </div>
                    <p className="text-[10px] font-bold flex-1 truncate">{w.title}</p>
                    {editing && (
                      <>
                        <button onClick={() => toggleVisible(w.id)} className="text-ink-400 hover:text-cyan-500">
                          {w.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                        <button onClick={() => removeWidget(w.id)} className="text-ink-400 hover:text-rose-500">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                  {w.visible && renderWidget(w)}
                </div>
              </Reorder.Item>
            )
          })}
        </Reorder.Group>
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">添加组件</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(TYPE_META) as WidgetType[]).map((k) => {
                const Meta = TYPE_META[k]
                const Icon = Meta.icon
                return (
                  <button key={k} onClick={() => addWidget(k)} className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800 border border-ink-200/60 dark:border-ink-800/60 text-left">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br mb-1', Meta.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold">{Meta.label}</p>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
