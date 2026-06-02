import { useState } from 'react'
import { motion } from 'framer-motion'
import { Store, CheckCircle, ChevronRight, Building, MapPin, Phone, FileText, Award, TrendingUp } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

const STEPS = [
  { id: 1, title: '资质信息', desc: '营业执照 / 法人身份证' },
  { id: 2, title: '店铺信息', desc: '店铺名称 / 类目 / 品牌' },
  { id: 3, title: '银行账户', desc: '对公账户信息' },
  { id: 4, title: '审核结果', desc: '3-5 个工作日' },
]

const CATEGORIES = ['数码', '美妆', '服饰', '美食', '家电', '母婴', '家居', '运动', '图书', '汽车']
const TIERS = [
  { name: '个人店', fee: 0, desc: '0 保证金 · 适合个人小卖家' },
  { name: '普通店', fee: 1000, desc: '1k 保证金 · 适合小品牌' },
  { name: '品牌店', fee: 5000, desc: '5k 保证金 · 需商标注册证' },
  { name: '旗舰店', fee: 10000, desc: '1w 保证金 · 需品牌授权' },
]

export function MerchantOnboarding() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    license: '',
    name: '',
    idCard: '',
    storeName: '',
    category: '',
    brand: '',
    account: '',
    bank: '',
    tier: '普通店',
  })
  const [submitted, setSubmitted] = useState(false)

  const next = () => {
    if (step === 1 && (!form.license || !form.name || !form.idCard)) { toast('请填写完整', 'error'); return }
    if (step === 2 && (!form.storeName || !form.category)) { toast('请填写完整', 'error'); return }
    if (step === 3 && (!form.account || !form.bank)) { toast('请填写完整', 'error'); return }
    if (step < 4) setStep(step + 1)
  }

  const submit = () => {
    setSubmitted(true)
    toast('申请已提交, 请等待审核', 'success')
  }

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center"
        >
          <CheckCircle className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold">申请已提交</h2>
        <p className="text-sm text-ink-500">我们将在 3-5 个工作日内完成审核</p>
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-4 text-left space-y-2 max-w-md mx-auto">
          <p className="text-xs font-bold">审核流程:</p>
          <div className="space-y-1 text-xs text-ink-500">
            <p>✓ 资质初审 (1-2 工作日)</p>
            <p>⏳ 品牌核查 (1-2 工作日)</p>
            <p>⏳ 财务复核 (1 工作日)</p>
            <p>⏳ 合同签署 (1 工作日)</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Store className="w-5 h-5" />
          <h2 className="text-lg font-bold">商家入驻</h2>
        </div>
        <p className="text-xs opacity-90">开启你的 Versa 商家之旅</p>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">10w+</p>
            <p className="text-[10px] opacity-80">入驻商家</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">¥3.2亿</p>
            <p className="text-[10px] opacity-80">月销售额</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">98%</p>
            <p className="text-[10px] opacity-80">商家满意度</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s) => (
          <div key={s.id} className="flex items-center flex-shrink-0">
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 h-7 rounded-full text-xs font-medium',
              step >= s.id ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-500'
            )}>
              <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-bold">{s.id}</span>
              {s.title}
            </div>
            {s.id < STEPS.length && <ChevronRight className="w-3 h-3 text-ink-400 mx-1" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-4 border border-ink-200/60 dark:border-ink-800/60 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-1.5"><FileText className="w-4 h-4" />资质信息</h3>
          <Input label="营业执照编号" value={form.license} onChange={(v) => setForm({ ...form, license: v })} placeholder="如: 91310101MA1F..." />
          <Input label="法人姓名" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="身份证号" value={form.idCard} onChange={(v) => setForm({ ...form, idCard: v })} placeholder="18 位身份证号" />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-4 border border-ink-200/60 dark:border-ink-800/60 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-1.5"><Store className="w-4 h-4" />店铺信息</h3>
            <Input label="店铺名称" value={form.storeName} onChange={(v) => setForm({ ...form, storeName: v })} placeholder="店铺名称 (3-20 字)" />
            <Input label="品牌名称" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} placeholder="选填, 没有品牌填「无」" />
            <div>
              <p className="text-xs text-ink-500 mb-1.5">主营类目</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, category: c })}
                    className={cn('px-2.5 h-7 rounded-full text-xs font-medium', form.category === c ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5"><Award className="w-4 h-4 text-amber-500" />店铺类型</h3>
            <div className="grid grid-cols-2 gap-2">
              {TIERS.map((t) => (
                <button
                  key={t.name}
                  onClick={() => setForm({ ...form, tier: t.name })}
                  className={cn('p-3 rounded-2xl text-left border-2 transition', form.tier === t.name ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/30')}
                >
                  <p className="text-sm font-bold">{t.name}</p>
                  <p className="text-[10px] text-ink-500 mt-0.5">{t.desc}</p>
                  <p className="text-lg font-bold text-orange-500 mt-1">¥{t.fee}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-4 border border-ink-200/60 dark:border-ink-800/60 space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-1.5"><Building className="w-4 h-4" />银行账户</h3>
          <Input label="开户银行" value={form.bank} onChange={(v) => setForm({ ...form, bank: v })} placeholder="如: 工商银行" />
          <Input label="对公账号" value={form.account} onChange={(v) => setForm({ ...form, account: v })} placeholder="19 位账号" />
          <p className="text-[10px] text-ink-500">用于结算货款提现, 请确保信息准确</p>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-4 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
            <h3 className="font-bold text-sm flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" />确认信息</h3>
            <Row label="营业执照" value={form.license} />
            <Row label="法人" value={form.name} />
            <Row label="店铺名" value={form.storeName} />
            <Row label="类目" value={form.category} />
            <Row label="店铺类型" value={form.tier} />
            <Row label="开户行" value={form.bank} />
            <Row label="账号" value={form.account} />
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-3 border border-amber-200/40 flex gap-2">
            <Phone className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-ink-500">提交后我们将在 3-5 个工作日完成审核, 审核结果将通过站内信通知</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="flex-1 h-10 rounded-xl bg-ink-100 dark:bg-ink-800 text-sm font-semibold">上一步</button>
        )}
        <button
          onClick={step === 4 ? submit : next}
          className="flex-1 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold"
        >
          {step === 4 ? '提交申请' : '下一步'}
        </button>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <p className="text-xs text-ink-500 mb-1">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 h-9 rounded-lg bg-white/60 dark:bg-ink-900/40 border border-ink-200 dark:border-ink-800 text-sm outline-none focus:ring-2 focus:ring-orange-500"
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-500">{label}</span>
      <span className="font-semibold">{value || '-'}</span>
    </div>
  )
}
