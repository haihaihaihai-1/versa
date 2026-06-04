/**
 * Versa · 创作者收益面板 (v13.0)
 * 收益总览 + 提现 + 税务 + 分销
 */
import { useEffect, useState } from 'react'
import { Wallet, TrendingUp, Send, Gift, Link2, Receipt, ArrowDownToLine } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import {
  PLATFORM_CONFIG,
  GIFT_CATALOG,
  getCreatorSummary,
  requestWithdrawal,
  calculateTax,
  type CreatorEarningSummary,
  type Withdrawal,
} from '../economy/creator'
import { cn } from '../lib/utils'

export function CreatorDashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<CreatorEarningSummary | null>(null)
  const [withdrawAmount, setWithdrawAmount] = useState('100')
  const [withdrawMethod, setWithdrawMethod] = useState<'alipay' | 'wechat' | 'bank'>('alipay')
  const [withdrawAccount, setWithdrawAccount] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<Withdrawal[]>([])
  const [taxYear, setTaxYear] = useState('2026')
  const [taxEstimate, setTaxEstimate] = useState<{ taxOwed: number; rate: number } | null>(null)

  const loadData = async () => {
    if (!user?.id) return
    const s = await getCreatorSummary(user.id)
    setSummary(s)
    setTaxEstimate({ taxOwed: calculateTax(s.totalGross).taxOwed, rate: calculateTax(s.totalGross).bracket.rate })
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  const onWithdraw = async () => {
    if (!user?.id) return
    setBusy(true)
    try {
      await requestWithdrawal({
        creatorId: user.id,
        amount: Number(withdrawAmount),
        method: withdrawMethod,
        account: withdrawAccount,
      })
      await loadData()
      setWithdrawAccount('')
      alert('✅ 提现申请已提交,1-3 个工作日到账')
    } catch (e: any) {
      alert('❌ ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="w-6 h-6 text-violet-500" />
          创作者中心
        </h1>
        <p className="text-sm text-ink-500 mt-1">收益总览 · 提现 · 税务 · 平台费率 {PLATFORM_CONFIG.platformFeeRate * 100}%</p>
      </header>

      {/* 总览卡片 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="总流水" value={summary?.totalGross ?? 0} prefix="¥" icon={TrendingUp} color="text-violet-500" />
        <Stat label="净收入" value={summary?.totalNet ?? 0} prefix="¥" icon={Wallet} color="text-emerald-500" />
        <Stat label="可提现" value={summary?.pending ?? 0} prefix="¥" icon={ArrowDownToLine} color="text-amber-500" />
        <Stat label="已提现" value={summary?.totalWithdrawn ?? 0} prefix="¥" icon={Send} color="text-ink-500" />
      </section>

      {/* 来源 */}
      {summary && Object.keys(summary.bySource).length > 0 && (
        <section className="rounded-2xl p-4 mb-6 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
          <h2 className="font-semibold mb-3">来源分布</h2>
          <div className="space-y-2">
            {Object.entries(summary.bySource).map(([src, data]) => (
              <div key={src} className="flex items-center justify-between text-sm">
                <span className="text-ink-600 dark:text-ink-400">{SOURCE_LABELS[src] || src}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono">¥{data.net.toFixed(2)}</span>
                  <span className="text-xs text-ink-500">({data.count} 笔)</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 提现 */}
      <section className="rounded-2xl p-4 mb-6 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4" /> 提现
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink-500">金额 (最低 ¥{PLATFORM_CONFIG.minWithdrawal}, 手续费 {PLATFORM_CONFIG.withdrawalFeeRate * 100}%)</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              min={PLATFORM_CONFIG.minWithdrawal}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-ink-100 dark:bg-ink-800 outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-ink-500">方式</label>
            <div className="flex gap-1 mt-1">
              {(['alipay', 'wechat', 'bank'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setWithdrawMethod(m)}
                  className={cn('flex-1 py-1.5 rounded-lg text-sm', withdrawMethod === m ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
                >
                  {m === 'alipay' ? '支付宝' : m === 'wechat' ? '微信' : '银行卡'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-ink-500">账号</label>
            <input
              value={withdrawAccount}
              onChange={(e) => setWithdrawAccount(e.target.value)}
              placeholder={withdrawMethod === 'bank' ? '银行卡号' : '账号/手机号'}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-ink-100 dark:bg-ink-800 outline-none text-sm"
            />
          </div>
          <button
            onClick={onWithdraw}
            disabled={busy || !withdrawAccount || !user?.id}
            className="w-full py-2 rounded-xl bg-violet-500 text-white disabled:opacity-50 text-sm font-medium"
          >
            {busy ? '处理中…' : '💸 申请提现'}
          </button>
        </div>
      </section>

      {/* 礼物库 */}
      <section className="rounded-2xl p-4 mb-6 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4" /> 礼物库 (创作者可得 {Math.round((1 - PLATFORM_CONFIG.platformFeeRate) * 100)}%)
        </h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {GIFT_CATALOG.map((g) => (
            <div key={g.id} className="p-2 rounded-xl bg-ink-50 dark:bg-ink-800/50 text-center">
              <div className="text-2xl">{g.emoji}</div>
              <div className="text-xs mt-1 truncate">{g.name}</div>
              <div className="text-xs text-violet-500 font-semibold">¥{g.price}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 税务估算 */}
      <section className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4" /> 税务估算
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink-500">纳税年度</label>
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-ink-100 dark:bg-ink-800 outline-none text-sm"
            >
              {[2026, 2025, 2024].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {taxEstimate && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-500">年总流水</span><span className="font-mono">¥{summary?.totalGross.toFixed(2) || '0.00'}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">应税所得</span><span className="font-mono">¥{Math.max(0, (summary?.totalGross ?? 0) - PLATFORM_CONFIG.taxThreshold).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">适用税率</span><span className="font-mono">{(taxEstimate.rate * 100).toFixed(0)}%</span></div>
              <div className="flex justify-between text-lg font-bold"><span>应纳税额</span><span className={cn('font-mono', taxEstimate.taxOwed > 0 ? 'text-rose-500' : 'text-emerald-500')}>¥{taxEstimate.taxOwed.toFixed(2)}</span></div>
              <p className="text-xs text-ink-500">起征点 ¥{PLATFORM_CONFIG.taxThreshold.toLocaleString()}/年 · 已代扣平台费 ¥{summary ? (summary.totalGross - summary.totalNet).toFixed(2) : '0.00'}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

const SOURCE_LABELS: Record<string, string> = {
  tip: '打赏',
  affiliate: '分销',
  subscription: '订阅',
  paid_content: '付费内容',
  ad_revenue: '广告分成',
}

function Stat({ label, value, prefix = '', icon: Icon, color }: { label: string; value: number; prefix?: string; icon: any; color: string }) {
  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
      <div className="flex items-center gap-2 text-xs text-ink-500">
        <Icon className={cn('w-3.5 h-3.5', color)} />
        {label}
      </div>
      <div className={cn('text-2xl font-bold mt-1', color)}>
        {prefix}{value.toFixed(2)}
      </div>
    </div>
  )
}
