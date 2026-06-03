import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, Sparkles, Loader2, Target, Shield, AlertCircle, TrendingUp, Award, BarChart3, Zap, Info } from 'lucide-react'
import { cn, formatNumber } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Position {
  symbol: string
  name: string
  sector: string
  value: number
  beta: number
  volatility: number
  expectedReturn: number
}

const STORAGE_KEY = 'versa:risk-portfolio-v1'

function load(): Position[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Position[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Position[] {
  return [
    { symbol: 'AAPL', name: '苹果', sector: '科技', value: 50000, beta: 1.25, volatility: 28, expectedReturn: 12 },
    { symbol: 'TSLA', name: '特斯拉', sector: '汽车', value: 30000, beta: 2.10, volatility: 65, expectedReturn: 15 },
    { symbol: 'NVDA', name: '英伟达', sector: '芯片', value: 40000, beta: 1.85, volatility: 55, expectedReturn: 20 },
    { symbol: '600519', name: '贵州茅台', sector: '消费', value: 60000, beta: 0.65, volatility: 25, expectedReturn: 8 },
    { symbol: '00700', name: '腾讯', sector: '互联网', value: 35000, beta: 1.10, volatility: 32, expectedReturn: 10 },
    { symbol: '国债', name: '国债 ETF', sector: '债券', value: 30000, beta: -0.10, volatility: 4, expectedReturn: 3 },
    { symbol: 'BTC', name: 'Bitcoin', sector: '加密', value: 25000, beta: 1.95, volatility: 75, expectedReturn: 25 },
  ]
}

export function RiskAnalyzer() {
  const [positions] = useState<Position[]>(load())
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [riskFree, setRiskFree] = useState('2.5')

  useEffect(() => { save(positions) }, [positions])

  const total = positions.reduce((s, p) => s + p.value, 0)

  // Weighted portfolio metrics
  const portfolioBeta = positions.reduce((s, p) => s + (p.value / total) * p.beta, 0)
  const portfolioVol = Math.sqrt(positions.reduce((s, p) => s + Math.pow((p.value / total) * p.volatility, 2), 0))
  const portfolioReturn = positions.reduce((s, p) => s + (p.value / total) * p.expectedReturn, 0)
  const sharpe = portfolioVol > 0 ? (portfolioReturn - +riskFree) / portfolioVol : 0

  // Sector concentration
  const sectorMap: { [k: string]: number } = {}
  positions.forEach((p) => { sectorMap[p.sector] = (sectorMap[p.sector] || 0) + p.value })
  const sectorConcentration = Math.max(...Object.values(sectorMap)) / total * 100
  const topSector = Object.entries(sectorMap).sort((a, b) => b[1] - a[1])[0]

  // Risk rating
  const riskLevel = (() => {
    if (portfolioVol < 10) return { label: '保守', color: 'emerald' }
    if (portfolioVol < 20) return { label: '稳健', color: 'cyan' }
    if (portfolioVol < 30) return { label: '平衡', color: 'amber' }
    if (portfolioVol < 40) return { label: '积极', color: 'orange' }
    return { label: '激进', color: 'rose' }
  })()

  // VaR (Value at Risk) - simple 95% confidence, ~1.65 std dev
  const dailyVol = portfolioVol / Math.sqrt(252)
  const var95 = total * dailyVol * 1.65

  // Max drawdown estimate
  const maxDrawdown = portfolioVol * 2.5

  // Diversification score
  const herfindahl = Object.values(sectorMap).reduce((s, v) => s + Math.pow(v / total, 2), 0)
  const diversification = Math.max(0, 100 - herfindahl * 1000)

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = `β ${portfolioBeta.toFixed(2)}, 波动 ${portfolioVol.toFixed(1)}%, 夏普 ${sharpe.toFixed(2)}, 行业集中度 ${sectorConcentration.toFixed(0)}%`
      const result = await aiComplete(`组合分析: ${summary}. 给出 1 段 80 字内风险与改进建议, 中文`, '你是 Versa 投资风控顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const colorClasses: { [k: string]: { bg: string; text: string; grad: string } } = {
    emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-500', grad: 'from-emerald-500 to-teal-500' },
    cyan: { bg: 'bg-cyan-500/15', text: 'text-cyan-500', grad: 'from-cyan-500 to-blue-500' },
    amber: { bg: 'bg-amber-500/15', text: 'text-amber-500', grad: 'from-amber-500 to-orange-500' },
    orange: { bg: 'bg-orange-500/15', text: 'text-orange-500', grad: 'from-orange-500 to-red-500' },
    rose: { bg: 'bg-rose-500/15', text: 'text-rose-500', grad: 'from-rose-500 to-red-600' },
  }
  const rc = colorClasses[riskLevel.color]

  return (
    <div className="space-y-3">
      <div className={cn('rounded-2xl p-3 text-white bg-gradient-to-br', rc.grad)}>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5" />
          <h2 className="text-lg font-bold">风险分析</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">β · 波动率 · 夏普 · VaR · 行业集中度</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{portfolioBeta.toFixed(2)}</p>
            <p className="text-[9px] opacity-80">组合 β</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{portfolioVol.toFixed(1)}%</p>
            <p className="text-[9px] opacity-80">年波动</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{sharpe.toFixed(2)}</p>
            <p className="text-[9px] opacity-80">夏普</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{riskLevel.label}</p>
            <p className="text-[9px] opacity-80">风险等级</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={runAI} disabled={loading} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 风险诊断
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-ink-500">无风险</span>
          <input type="number" step="0.1" value={riskFree} onChange={(e) => setRiskFree(e.target.value)} className="w-14 px-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-xs text-center outline-none" />
        </div>
      </div>

      {aiTip && (
        <div className="bg-cyan-50/40 dark:bg-cyan-900/20 rounded-xl p-2 border border-cyan-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-[10px] text-ink-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />日 VaR (95%)</p>
          <p className="text-base font-bold text-rose-500">¥{formatNumber(var95)}</p>
          <p className="text-[9px] text-ink-500 mt-0.5">日亏损 95% 概率不超过此值</p>
        </div>
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-[10px] text-ink-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" />预期年化</p>
          <p className="text-base font-bold text-emerald-500">{portfolioReturn.toFixed(1)}%</p>
          <p className="text-[9px] text-ink-500 mt-0.5">¥{formatNumber(total * portfolioReturn / 100)}</p>
        </div>
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-[10px] text-ink-500 flex items-center gap-1"><Shield className="w-3 h-3" />最大回撤估计</p>
          <p className="text-base font-bold text-amber-500">-{maxDrawdown.toFixed(0)}%</p>
          <p className="text-[9px] text-ink-500 mt-0.5">¥{formatNumber(total * maxDrawdown / 100)}</p>
        </div>
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-[10px] text-ink-500 flex items-center gap-1"><Award className="w-3 h-3" />分散度</p>
          <p className="text-base font-bold text-violet-500">{diversification.toFixed(0)}</p>
          <p className="text-[9px] text-ink-500 mt-0.5">{diversification > 60 ? '良好' : diversification > 40 ? '一般' : '集中'}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-semibold mb-1.5">行业分布 ({Object.keys(sectorMap).length})</p>
        <div className="space-y-1">
          {Object.entries(sectorMap).sort((a, b) => b[1] - a[1]).map(([sector, value]) => {
            const pct = (value / total) * 100
            return (
              <div key={sector}>
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3 text-ink-500" />{sector}</span>
                  <span className="font-semibold">{pct.toFixed(1)}% · ¥{formatNumber(value)}</span>
                </div>
                <div className="h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" />
                </div>
              </div>
            )
          })}
        </div>
        {sectorConcentration > 40 && (
          <div className="mt-1.5 flex items-start gap-1.5 p-1.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60">
            <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-amber-700 dark:text-amber-300">{topSector[0]} 行业占比 {sectorConcentration.toFixed(0)}%, 集中度过高</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-semibold mb-1.5">持仓详情</p>
        <div className="space-y-1">
          {positions.map((p) => {
            const weight = (p.value / total) * 100
            return (
              <div key={p.symbol} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-16 truncate font-semibold">{p.name}</span>
                <div className="flex-1 h-1 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${weight}%` }} />
                </div>
                <span className="font-bold w-12 text-right">{weight.toFixed(1)}%</span>
                <span className="w-10 text-right text-ink-500">β{p.beta.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
