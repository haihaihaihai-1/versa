import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Sparkles, Award, Heart, Users, Globe, Loader2, Quote } from 'lucide-react'
import { cn } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Brand {
  id: string
  name: string
  logo: string
  cover: string
  founded: number
  origin: string
  founder: string
  philosophy: string
  story: string
  milestones: { year: number; event: string }[]
  awards: string[]
  facts: { label: string; value: string }[]
}

const BRANDS: Brand[] = [
  {
    id: 'b1', name: 'Apple', logo: 'https://picsum.photos/seed/apple-logo/200/200', cover: 'https://picsum.photos/seed/apple-cover/800/300',
    founded: 1976, origin: '美国 加州', founder: 'Steve Jobs, Steve Wozniak, Ronald Wayne',
    philosophy: '「科技应该与人文相融合」',
    story: '1976 年, 在一个车库里, 三个年轻人创立了 Apple。从 Apple I 到 iPhone, Apple 一直致力于将复杂技术变得简单, 让每个人都能享受科技的便利。',
    milestones: [
      { year: 1976, event: 'Apple I 发布' },
      { year: 1984, event: 'Macintosh 开启个人电脑新时代' },
      { year: 2007, event: 'iPhone 重新定义手机' },
      { year: 2010, event: 'iPad 创造平板品类' },
      { year: 2024, event: 'Vision Pro 开启空间计算' },
    ],
    awards: ['全球最具价值品牌 10 连冠', '设计金奖 200+ 项', 'J.D. Power 满意度第一'],
    facts: [
      { label: '全球员工', value: '16.4 万' },
      { label: '门店数量', value: '500+' },
      { label: '生态设备', value: '20 亿+' },
      { label: 'App Store 应用', value: '180 万' },
    ],
  },
  {
    id: 'b2', name: '戴森 Dyson', logo: 'https://picsum.photos/seed/dyson-logo/200/200', cover: 'https://picsum.photos/seed/dyson-cover/800/300',
    founded: 1991, origin: '英国 马姆斯伯里', founder: 'James Dyson',
    philosophy: '「解决他人忽视的问题」',
    story: '5127 个原型, 5 年研发, James Dyson 用工程师的执着颠覆了吸尘器行业。戴森相信, 真正的好产品来自于对细节的极致追求。',
    milestones: [
      { year: 1991, event: 'G-Force 吸尘器上市' },
      { year: 2006, event: '进入中国市场' },
      { year: 2016, event: 'Supersonic 吹风机颠覆传统' },
      { year: 2023, event: 'Zone 空气净化耳机' },
    ],
    awards: ['IF 设计金奖 50+ 项', '红点奖 100+ 项', '英国女王企业奖'],
    facts: [
      { label: '专利数量', value: '15000+' },
      { label: '全球员工', value: '1.4 万' },
      { label: '研发投入占比', value: '40%' },
      { label: '产品出口国', value: '80+' },
    ],
  },
  {
    id: 'b3', name: '雅诗兰黛 Estée Lauder', logo: 'https://picsum.photos/seed/estee-logo/200/200', cover: 'https://picsum.photos/seed/estee-cover/800/300',
    founded: 1946, origin: '美国 纽约', founder: 'Estée Lauder & Joseph Lauder',
    philosophy: '「每一位女性都可以拥有美丽」',
    story: '从一瓶护肤霜开始, Estée Lauder 夫人用「面霜外交」敲开百货商店的大门。今天, 集团拥有 30+ 顶级品牌, 服务全球。',
    milestones: [
      { year: 1946, event: '雅诗兰黛品牌创立' },
      { year: 1968, event: 'Clinique 倩碧推出' },
      { year: 1995, event: '进入中国' },
      { year: 2020, event: '成为可持续发展标杆' },
    ],
    awards: ['全球美妆品牌 Top 3', '女性领导力奖 50+ 项', '可持续企业金奖'],
    facts: [
      { label: '旗下品牌', value: '30+' },
      { label: '全球员工', value: '4.8 万' },
      { label: '研发实验室', value: '7 个' },
      { label: '专利配方', value: '900+' },
    ],
  },
]

export function BrandStory() {
  const [active, setActive] = useState<Brand>(BRANDS[0])
  const [aiStory, setAiStory] = useState('')
  const [loading, setLoading] = useState(false)

  const generateAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(
        `为品牌「${active.name}」写一段 100-200 字的有温度的品牌故事, 体现其创立初心和独特之处`,
        '你是 Versa 品牌叙事专家, 优雅有温度, 中文'
      )
      setAiStory(result)
    } catch (e: any) {
      toast(e?.message || '生成失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-lg font-bold">品牌故事</h2>
        </div>
        <p className="text-xs opacity-90">了解每个品牌背后的温度与坚持</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {BRANDS.map((b) => (
          <button
            key={b.id}
            onClick={() => { setActive(b); setAiStory('') }}
            className={cn(
              'flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold flex items-center gap-1.5 transition',
              active.id === b.id ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60'
            )}
          >
            <img src={b.logo} alt={b.name} className="w-4 h-4 rounded-full" />
            {b.name}
          </button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
        <div className="relative h-32 overflow-hidden">
          <img src={active.cover} alt={active.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-3 flex items-center gap-2">
            <img src={active.logo} alt={active.name} className="w-10 h-10 rounded-full bg-white" />
            <div className="text-white">
              <p className="text-base font-bold">{active.name}</p>
              <p className="text-[10px] opacity-80">{active.origin} · 创立于 {active.founded}</p>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-3">
          <div className="relative bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border-l-4 border-amber-400">
            <Quote className="absolute top-1 right-1 w-5 h-5 text-amber-400 opacity-30" />
            <p className="text-sm font-semibold italic">{active.philosophy}</p>
            <p className="text-[10px] text-ink-500 mt-1">— 创始人 {active.founder}</p>
          </div>

          <div>
            <h3 className="text-sm font-bold mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />品牌故事
            </h3>
            <p className="text-xs leading-relaxed text-ink-700 dark:text-ink-300">{active.story}</p>
          </div>

          <button
            onClick={generateAI}
            disabled={loading}
            className="w-full h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            AI 续写品牌故事
          </button>

          {aiStory && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-2.5 text-xs leading-relaxed whitespace-pre-wrap border border-amber-200/40"
            >
              {aiStory}
            </motion.div>
          )}

          <div>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />里程碑
            </h3>
            <div className="relative pl-6 space-y-2">
              <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gradient-to-b from-amber-400 to-orange-400" />
              {active.milestones.map((m) => (
                <div key={m.year} className="relative">
                  <div className="absolute -left-4 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-white dark:ring-ink-900" />
                  <p className="text-[10px] font-bold text-amber-500">{m.year}</p>
                  <p className="text-xs">{m.event}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold mb-1.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />荣誉
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {active.awards.map((a) => (
                <span key={a} className="px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 text-[10px] font-semibold border border-amber-200/40">
                  🏆 {a}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {active.facts.map((f) => (
              <div key={f.label} className="bg-ink-50 dark:bg-ink-900/40 rounded-xl p-2 text-center">
                <p className="text-base font-bold text-amber-500">{f.value}</p>
                <p className="text-[10px] text-ink-500">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
