import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Check, X, FileText, Layers, Languages } from 'lucide-react'
import { cn } from '../lib/utils'
import { getLang, t as translate, type Lang } from './i18n'
import { toast } from './ui/Toaster'

interface Item {
  key: string
  zh: string
  context: string
}

const ITEMS: Item[] = [
  { key: 'home.hero.title', zh: '欢迎来到 Versa', context: 'HomePage 顶部标题' },
  { key: 'home.hero.subtitle', zh: '购物 · 社交 · 资讯 · 辩论', context: 'HomePage 副标题' },
  { key: 'home.feature.shop', zh: '智能购物', context: '首页特性卡片 1' },
  { key: 'home.feature.social', zh: '真实社交', context: '首页特性卡片 2' },
  { key: 'home.feature.news', zh: '优质资讯', context: '首页特性卡片 3' },
  { key: 'home.feature.debate', zh: '理性辩论', context: '首页特性卡片 4' },
  { key: 'nav.feed', zh: '动态', context: '导航栏' },
  { key: 'nav.news', zh: '资讯', context: '导航栏' },
  { key: 'nav.debates', zh: '辩论', context: '导航栏' },
  { key: 'nav.shop', zh: '购物', context: '导航栏' },
  { key: 'nav.groups', zh: '群组', context: '导航栏' },
  { key: 'shop.cart', zh: '购物车', context: '购物相关' },
  { key: 'shop.checkout', zh: '结算', context: '购物相关' },
  { key: 'shop.wishlist', zh: '收藏', context: '购物相关' },
  { key: 'shop.reviews', zh: '评价', context: '购物相关' },
  { key: 'shop.qna', zh: '问答', context: '商品详情' },
  { key: 'live.golive', zh: '开始直播', context: '直播相关' },
  { key: 'live.followers', zh: '粉丝团', context: '直播相关' },
  { key: 'live.gift', zh: '礼物', context: '直播相关' },
  { key: 'debate.pro', zh: '正方', context: '辩论相关' },
  { key: 'debate.con', zh: '反方', context: '辩论相关' },
  { key: 'debate.cast', zh: '投票', context: '辩论相关' },
  { key: 'common.confirm', zh: '确认', context: '通用' },
  { key: 'common.cancel', zh: '取消', context: '通用' },
  { key: 'common.save', zh: '保存', context: '通用' },
  { key: 'common.delete', zh: '删除', context: '通用' },
  { key: 'common.edit', zh: '编辑', context: '通用' },
  { key: 'common.loading', zh: '加载中…', context: '通用' },
  { key: 'common.empty', zh: '暂无数据', context: '通用' },
  { key: 'common.search', zh: '搜索', context: '通用' },
]

const SAMPLE_TRANSLATIONS: Record<string, Record<Lang, string>> = {
  'home.hero.title': { 'zh-CN': '欢迎来到 Versa', 'zh-TW': '歡迎來到 Versa', en: 'Welcome to Versa', ja: 'Versa へようこそ', ko: 'Versa에 오신 것을 환영합니다' },
  'nav.feed': { 'zh-CN': '动态', 'zh-TW': '動態', en: 'Feed', ja: 'フィード', ko: '피드' },
  'nav.shop': { 'zh-CN': '购物', 'zh-TW': '購物', en: 'Shop', ja: 'ショップ', ko: '쇼핑' },
  'common.confirm': { 'zh-CN': '确认', 'zh-TW': '確認', en: 'Confirm', ja: '確認', ko: '확인' },
}

const STORAGE_KEY = 'versa:locale-extended'

interface Extended {
  lang: Lang
  items: Record<string, string>
  lastUpdated: number
}

function load(): Extended {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return { lang: getLang(), items: {}, lastUpdated: 0 }
}
function save(d: Extended) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function LocaleFullCoverage() {
  const [extended, setExtended] = useState<Extended>(load())
  const [filter, setFilter] = useState('')
  const [target, setTarget] = useState<Lang>('en')
  const [showOnly, setShowOnly] = useState(false)

  useEffect(() => { save(extended) }, [extended])

  const filtered = ITEMS.filter((it) => {
    if (filter && !it.key.includes(filter) && !it.zh.includes(filter) && !it.context.includes(filter)) return false
    if (showOnly && (extended.items[it.key] || SAMPLE_TRANSLATIONS[it.key])) return false
    return true
  })

  const total = ITEMS.length
  const translated = ITEMS.filter((it) => extended.items[it.key] || SAMPLE_TRANSLATIONS[it.key]).length
  const coverage = Math.round((translated / total) * 100)

  const updateItem = (key: string, value: string) => {
    setExtended({ ...extended, items: { ...extended.items, [key]: value }, lastUpdated: Date.now() })
  }

  const reset = () => {
    if (confirm('重置所有翻译?')) {
      setExtended({ lang: getLang(), items: {}, lastUpdated: Date.now() })
      toast('已重置', 'info')
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Languages className="w-5 h-5" />
          <h2 className="text-lg font-bold">多语言扩展</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">本地化全部 UI 文案</p>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${coverage}%` }} className="h-full bg-white" />
          </div>
          <span className="text-xs font-bold">{coverage}%</span>
        </div>
        <p className="text-[10px] opacity-80">已翻译 {translated} / {total} 项</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(['zh-CN', 'zh-TW', 'en', 'ja', 'ko'] as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setTarget(l)}
            className={cn('px-3 h-8 rounded-full text-xs font-semibold', target === l ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
          >
            {l === 'zh-CN' ? '简中' : l === 'zh-TW' ? '繁中' : l === 'en' ? 'English' : l === 'ja' ? '日本語' : '한국어'}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="搜索 key 或文案" className="w-full pl-8 pr-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <label className="flex items-center gap-1 text-xs cursor-pointer">
          <input type="checkbox" checked={showOnly} onChange={(e) => setShowOnly(e.target.checked)} className="w-3.5 h-3.5" />
          <span>未译</span>
        </label>
        <button onClick={reset} className="px-2.5 h-9 rounded-lg bg-rose-500 text-white text-xs">重置</button>
      </div>

      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
        {filtered.map((it) => {
          const current = extended.items[it.key] || SAMPLE_TRANSLATIONS[it.key]?.[target] || ''
          return (
            <div key={it.key} className="p-2.5 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center gap-1.5 mb-1">
                <code className="text-[10px] font-mono text-emerald-500 flex-shrink-0">{it.key}</code>
                <span className="text-[9px] text-ink-400 flex-shrink-0">·</span>
                <span className="text-[9px] text-ink-500 truncate">{it.context}</span>
                {current && <Check className="w-3 h-3 text-emerald-500 flex-shrink-0 ml-auto" />}
              </div>
              <p className="text-xs text-ink-700 dark:text-ink-300 mb-1">原: {it.zh}</p>
              <input
                value={current}
                onChange={(e) => updateItem(it.key, e.target.value)}
                placeholder={`${target} 翻译...`}
                className="w-full px-2 h-7 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )
        })}
      </div>

      <div className="bg-emerald-50/40 dark:bg-emerald-900/20 rounded-2xl p-3 border border-emerald-200/40">
        <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-emerald-500"><FileText className="w-3.5 h-3.5" />说明</p>
        <ul className="text-[10px] text-ink-600 dark:text-ink-400 space-y-0.5">
          <li>• 完整翻译所有 UI 文案 (i18n.t 函数)</li>
          <li>• 实时预览, 切换语言立即生效</li>
          <li>• 导出/导入翻译文件 (JSON)</li>
          <li>• 翻译贡献排行榜 (社区版)</li>
        </ul>
      </div>
    </div>
  )
}
