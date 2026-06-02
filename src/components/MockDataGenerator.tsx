import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Database, Sparkles, Loader2, Plus, Trash2, Copy, Check, RefreshCw, Users, ShoppingBag, FileText, Hash } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

type Schema = 'user' | 'product' | 'order' | 'address' | 'comment' | 'event'

const SCHEMAS: Record<Schema, { label: string; emoji: string; fields: string[] }> = {
  user: { label: '用户', emoji: '👤', fields: ['id', 'name', 'email', 'avatar', 'bio', 'followers', 'createdAt'] },
  product: { label: '商品', emoji: '🛍️', fields: ['id', 'name', 'price', 'category', 'stock', 'rating', 'image'] },
  order: { label: '订单', emoji: '📦', fields: ['id', 'userId', 'total', 'status', 'createdAt', 'items'] },
  address: { label: '地址', emoji: '📍', fields: ['id', 'street', 'city', 'province', 'zip', 'country'] },
  comment: { label: '评论', emoji: '💬', fields: ['id', 'userId', 'postId', 'content', 'likes', 'createdAt'] },
  event: { label: '事件', emoji: '📅', fields: ['id', 'title', 'startAt', 'endAt', 'location', 'attendees'] },
}

const SAMPLE_FIRST = ['张', '王', '李', '刘', '陈', '杨', '黄', '赵', '吴', '周', '徐', '孙', '马', '朱', '胡']
const SAMPLE_LAST = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛']
const PRODUCT_NOUNS = ['手机壳', '咖啡杯', 'T恤', '耳机', '背包', '手表', '笔记本', '鼠标垫', '香水', '面膜', '零食', '书籍']
const PRODUCT_BRANDS = ['Apple', '华为', '小米', '索尼', '三星', '戴森', '飞利浦', '雀巢', '星巴克', 'Lego', 'IKEA', '无印']
const CITIES = ['上海', '北京', '深圳', '广州', '杭州', '成都', '南京', '武汉', '苏州', '西安']
const STREETS = ['人民路', '中山路', '解放路', '建国路', '南京路', '复兴路', '长安街']
const STATUSES = ['待付款', '已付款', '已发货', '已完成', '已取消']
const POST_TITLES = ['今天去了新开的咖啡店', '618 战果分享', '618 必买清单', '新手入门教程', '夏日穿搭灵感']

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(a: number, b: number) { return Math.floor(Math.random() * (b - a + 1)) + a }

const STORAGE_KEY = 'versa:mock-data'

function load(): { id: string; schema: Schema; json: string; at: number }[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function saveHist(d: any) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function generateUser(): any {
  const f = rand(SAMPLE_FIRST); const l = rand(SAMPLE_LAST)
  return { id: uid(), name: f + l, email: `${f.toLowerCase()}.${l.toLowerCase()}${randInt(1, 99)}@example.com`, avatar: `https://i.pravatar.cc/100?img=${randInt(1, 70)}`, bio: 'Versa 用户', followers: randInt(0, 50000), createdAt: new Date(Date.now() - randInt(1, 365) * 86400000).toISOString() }
}

function generateProduct(): any {
  const brand = rand(PRODUCT_BRANDS); const noun = rand(PRODUCT_NOUNS)
  return { id: uid(), name: `${brand} ${noun} ${randInt(2024, 2026)}`, price: randInt(29, 2999), category: rand(['数码', '服饰', '美食', '美妆', '家居']), stock: randInt(0, 500), rating: (Math.random() * 2 + 3).toFixed(1), image: `https://picsum.photos/seed/${Date.now()}/300/300` }
}

function generateOrder(): any {
  const items = Array.from({ length: randInt(1, 5) }, () => ({ name: rand(PRODUCT_NOUNS), qty: randInt(1, 3), price: randInt(29, 999) }))
  const total = items.reduce((s, i) => s + i.qty * i.price, 0)
  return { id: uid(), userId: randInt(1, 1000), total, status: rand(STATUSES), createdAt: new Date(Date.now() - randInt(1, 90) * 86400000).toISOString(), items }
}

function generateAddress(): any {
  return { id: uid(), street: `${rand(STREETS)}${randInt(1, 999)}号`, city: rand(CITIES), province: rand(CITIES) + '省', zip: `${randInt(10, 99)}${randInt(100, 999)}`, country: '中国' }
}

function generateComment(): any {
  return { id: uid(), userId: randInt(1, 1000), postId: randInt(1, 1000), content: rand(['太棒了!', '支持!', '666', '很实用', '收藏了', '已下单']), likes: randInt(0, 500), createdAt: new Date(Date.now() - randInt(1, 30) * 86400000).toISOString() }
}

function generateEvent(): any {
  const start = new Date(Date.now() + randInt(1, 60) * 86400000)
  return { id: uid(), title: rand(POST_TITLES), startAt: start.toISOString(), endAt: new Date(start.getTime() + randInt(1, 6) * 3600000).toISOString(), location: rand(CITIES), attendees: randInt(1, 200) }
}

const GENERATORS: Record<Schema, () => any> = { user: generateUser, product: generateProduct, order: generateOrder, address: generateAddress, comment: generateComment, event: generateEvent }

export function MockDataGenerator() {
  const [schema, setSchema] = useState<Schema>('user')
  const [count, setCount] = useState(10)
  const [data, setData] = useState<any[]>([])
  const [format, setFormat] = useState<'json' | 'csv' | 'ts'>('json')
  const [history, setHistory] = useState(load())
  const [copied, setCopied] = useState(false)
  const [aiSchema, setAiSchema] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { saveHist(history) }, [history])

  const generate = () => {
    const arr = Array.from({ length: count }, () => GENERATORS[schema]())
    setData(arr)
  }

  const serialize = () => {
    if (format === 'json') return JSON.stringify(data, null, 2)
    if (format === 'ts') return `export interface ${SCHEMAS[schema].label} ${JSON.stringify(data[0] || {}, null, 2)}\n\nexport const ${SCHEMAS[schema].label.toLowerCase()}s: ${SCHEMAS[schema].label}[] = ${JSON.stringify(data, null, 2)}`
    if (data.length === 0) return ''
    const headers = Object.keys(data[0])
    const rows = data.map((d) => headers.map((h) => JSON.stringify(d[h] ?? '')).join(','))
    return [headers.join(','), ...rows].join('\n')
  }

  const copy = () => {
    navigator.clipboard?.writeText(serialize())
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast('已复制', 'success')
  }

  const save = () => {
    setHistory([{ id: 'm' + Date.now(), schema, json: serialize(), at: Date.now() }, ...history].slice(0, 10))
    saveHist([{ id: 'm' + Date.now(), schema, json: serialize(), at: Date.now() }, ...history].slice(0, 10))
    toast('已保存', 'success')
  }
  const loadItem = (h: any) => { setSchema(h.schema); setData(JSON.parse(h.json)) }
  const remove = (id: string) => setHistory(history.filter((h: any) => h.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`推荐 3 个常用 mock 数据场景 (50-80 字)`, '你是 Versa 测试工程师, 简洁实用, 中文')
      setAiSchema(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5" />
          <h2 className="text-lg font-bold">模拟数据</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">6 模板 · JSON/CSV/TS</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{Object.keys(SCHEMAS).length}</p>
            <p className="text-[10px] opacity-80">模型</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{data.length}</p>
            <p className="text-[10px] opacity-80">已生成</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{history.length}</p>
            <p className="text-[10px] opacity-80">保存</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {(Object.keys(SCHEMAS) as Schema[]).map((s) => (
          <button key={s} onClick={() => { setSchema(s); setData([]) }} className={cn('h-12 rounded-lg flex flex-col items-center justify-center gap-0.5', schema === s ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            <span className="text-base">{SCHEMAS[s].emoji}</span>
            <span className="text-[10px] font-semibold">{SCHEMAS[s].label}</span>
            <span className="text-[9px] opacity-70">{SCHEMAS[s].fields.length} 字段</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-500">数量:</span>
          <input type="range" min="1" max="100" value={count} onChange={(e) => setCount(+e.target.value)} className="flex-1 accent-violet-500" />
          <span className="text-xs font-bold w-8 text-right">{count}</span>
        </div>
        <div className="flex gap-1.5">
          <button onClick={generate} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" />生成 {count} 条
          </button>
          <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-bold">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          </button>
        </div>
        {aiSchema && (
          <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded p-2 border border-violet-200/40">
            <p className="text-[10px] leading-relaxed">{aiSchema}</p>
          </div>
        )}
      </div>

      {data.length > 0 && (
        <>
          <div className="flex gap-1.5">
            {(['json', 'csv', 'ts'] as const).map((f) => (
              <button key={f} onClick={() => setFormat(f)} className={cn('flex-1 h-7 rounded-lg text-[10px] font-semibold', format === f ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button onClick={copy} className="flex-1 h-8 rounded-lg bg-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}复制
            </button>
            <button onClick={save} className="flex-1 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">保存</button>
          </div>
          <pre className="p-3 rounded-lg bg-ink-900 text-ink-100 text-[10px] font-mono overflow-x-auto max-h-60 whitespace-pre-wrap">{serialize()}</pre>
        </>
      )}

      {history.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">历史</p>
          {history.slice(0, 5).map((h: any) => (
            <div key={h.id} className="flex items-center gap-1.5 p-2 rounded-lg bg-ink-50 dark:bg-ink-800">
              <button onClick={() => loadItem(h)} className="flex-1 text-left min-w-0">
                <p className="text-[10px] font-bold text-violet-500">{SCHEMAS[h.schema as Schema].label}</p>
                <p className="text-[10px] text-ink-500">{new Date(h.at).toLocaleString('zh-CN')}</p>
              </button>
              <button onClick={() => remove(h.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
