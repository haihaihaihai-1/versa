/**
 * Versa · Privacy / GDPR Playground (v30.0)
 * - Consent / PII Classifier / Anonymizer / Export / Eraser / Retention / DSR / Cookie
 */
import { useEffect, useMemo, useState } from 'react'
import {
  consents, classifier, anonymizer, exporter, eraser, retention, dsrService,
  cookieConsent, dataStore, persistPrivacy, loadPrivacy, summarizePrivacy,
  type ConsentPurpose, type AnonymizeMethod, type DataCategory,
} from './index'

type Tab = 'consent' | 'classifier' | 'anonymize' | 'export' | 'eraser' | 'retention' | 'dsr' | 'cookie' | 'metrics'

export function PrivacyPage() {
  const [tab, setTab] = useState<Tab>('consent')
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])

  useEffect(() => {
    if (consents.getCurrentPolicy() === undefined) seedDemo()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-fuchsia-50/30 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Privacy · v30.0
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            GDPR 合规平台 · 同意 · PII 分类 · 匿名化 · 数据导出 · 被遗忘权 · 保留策略 · DSR · Cookie
          </p>
        </header>

        <nav className="mb-6 flex gap-2 border-b border-slate-200 overflow-x-auto">
          {([
            ['consent', '同意管理'],
            ['classifier', 'PII 分类'],
            ['anonymize', '匿名化'],
            ['export', '数据导出'],
            ['eraser', '被遗忘权'],
            ['retention', '保留策略'],
            ['dsr', '数据主体请求'],
            ['cookie', 'Cookie 同意'],
            ['metrics', '指标'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === t ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-6">
          <main>
            {tab === 'consent' && <ConsentTab tick={tick} />}
            {tab === 'classifier' && <ClassifierTab tick={tick} />}
            {tab === 'anonymize' && <AnonymizeTab tick={tick} />}
            {tab === 'export' && <ExportTab tick={tick} />}
            {tab === 'eraser' && <EraserTab tick={tick} />}
            {tab === 'retention' && <RetentionTab tick={tick} />}
            {tab === 'dsr' && <DSRTab tick={tick} />}
            {tab === 'cookie' && <CookieTab tick={tick} />}
            {tab === 'metrics' && <MetricsTab tick={tick} />}
          </main>
          <Sidebar tick={tick} />
        </div>
      </div>
    </div>
  )
}

// ============== Consent Tab ==============

function ConsentTab({ tick }: { tick: number }) {
  void tick
  const [userId, setUserId] = useState('user-1')
  const [version, setVersion] = useState('1.0.0')
  const [summary, setSummary] = useState('Updated analytics disclosure')
  const purposes: ConsentPurpose[] = ['analytics', 'marketing', 'personalization', 'third-party', 'ai-training']

  const snap = consents.snapshot(userId)

  const updatePolicy = (): void => {
    consents.setCurrentPolicy({ id: `p-${Date.now()}`, version, effectiveAt: Date.now(), summary, text: '' })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">策略版本管理</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Field label="版本号"><input value={version} onChange={e => setVersion(e.target.value)} className={inputClass} /></Field>
          <Field label="变更摘要"><input value={summary} onChange={e => setSummary(e.target.value)} className={inputClass} /></Field>
          <Field label=" "><Btn onClick={updatePolicy} variant="primary">发布新版本</Btn></Field>
        </div>
        <div className="text-xs text-slate-500">当前: <span className="font-mono text-slate-700">{consents.getCurrentPolicy()?.version}</span> · 共 {consents.listPolicies().length} 个历史版本</div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">用户同意状态</h2>
        <div className="mb-3">
          <Field label="用户 ID"><input value={userId} onChange={e => setUserId(e.target.value)} className={inputClass} /></Field>
        </div>
        <div className="space-y-2">
          {purposes.map(p => (
            <div key={p} className="flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-slate-700">{p}</span>
                <StatusBadge status={snap[p]} />
              </div>
              <div className="flex gap-1">
                <Btn onClick={() => consents.grant(userId, p, 'banner', '127.0.0.1', 'demo')} variant="primary">同意</Btn>
                <Btn onClick={() => consents.deny(userId, p, 'banner', '127.0.0.1', 'demo')}>拒绝</Btn>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Btn onClick={() => consents.revokeAll(userId, 'settings')}>撤销全部</Btn>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">同意历史 ({userId})</h2>
        <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-[11px]">
          {consents.history(userId).slice(-15).reverse().map((c, i) => (
            <div key={i} className="px-2 py-1 bg-slate-50 rounded">
              <span className="text-slate-500">{new Date(c.ts).toISOString().slice(11, 19)}</span>{' '}
              <span className={c.status === 'granted' ? 'text-green-600' : 'text-red-600'}>{c.status}</span>{' '}
              <span className="text-slate-700">{c.purpose}</span>{' '}
              <span className="text-slate-500">v{c.version} · {c.source}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============== Classifier Tab ==============

function ClassifierTab({ tick }: { tick: number }) {
  void tick
  const [text, setText] = useState('Contact alice@example.com or call 555-123-4567. Server IP: 192.168.1.1. ID: 110101199003078888')
  const [record, setRecord] = useState('{"name": "Alice Wang", "email": "alice@example.com", "phone": "13800138000", "age": 30}')

  const textMatches = classifier.scanText(text)
  let recordMatches: ReturnType<typeof classifier.classifyRecord> = []
  try {
    const r = JSON.parse(record)
    recordMatches = classifier.classifyRecord(r)
  } catch { /* invalid JSON */ }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">文本扫描</h2>
        <Field label="原始文本"><textarea value={text} onChange={e => setText(e.target.value)} className={`${inputClass} h-24 font-mono text-xs`} /></Field>
        <div className="mt-3">
          <h3 className="text-xs font-semibold text-slate-600 mb-2">检测到的 PII ({textMatches.length})</h3>
          <div className="space-y-1">
            {textMatches.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs px-2 py-1 bg-violet-50 rounded">
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-violet-200 text-violet-800 text-[10px]">{m.kind}</span>{' '}
                  <span className="font-mono text-slate-700">{m.value}</span>
                </div>
                <span className="text-slate-500">conf={m.confidence.toFixed(2)}</span>
              </div>
            ))}
            {textMatches.length === 0 && <p className="text-xs text-slate-400">无</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">结构化记录扫描</h2>
        <Field label="JSON 记录"><textarea value={record} onChange={e => setRecord(e.target.value)} className={`${inputClass} h-20 font-mono text-xs`} /></Field>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {recordMatches.map((m, i) => (
            <div key={i} className="px-2 py-1 bg-fuchsia-50 rounded">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-fuchsia-200 text-fuchsia-800">{m.kind}</span>
              <div className="font-mono truncate text-slate-700">{m.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-slate-500">已支持类型: {classifier.listKinds().join(', ')}</div>
      </div>
    </div>
  )
}

// ============== Anonymize Tab ==============

function AnonymizeTab({ tick }: { tick: number }) {
  void tick
  const [input, setInput] = useState('{"name": "Alice Wang", "email": "alice@example.com", "phone": "13800138000", "age": 30, "city": "Beijing"}')
  const [method, setMethod] = useState<AnonymizeMethod>('mask')
  const [skipName, setSkipName] = useState(false)

  let result: ReturnType<typeof anonymizer.anonymize> | null = null
  let error: string | null = null
  try {
    const parsed = JSON.parse(input)
    result = anonymizer.anonymize(parsed, { method, skipFields: skipName ? ['name'] : [] })
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">匿名化器</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Field label="方法">
            <select value={method} onChange={e => setMethod(e.target.value as AnonymizeMethod)} className={inputClass}>
              <option value="redact">redact - 完全删除</option>
              <option value="mask">mask - 部分遮蔽</option>
              <option value="hash">hash - 哈希</option>
              <option value="pseudonymize">pseudonymize - 假名化</option>
              <option value="generalize">generalize - 泛化</option>
            </select>
          </Field>
          <Field label=" ">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={skipName} onChange={e => setSkipName(e.target.checked)} />
              跳过 name 字段
            </label>
          </Field>
        </div>
        <Field label="输入 JSON"><textarea value={input} onChange={e => setInput(e.target.value)} className={`${inputClass} h-24 font-mono text-xs`} /></Field>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-900">JSON 错误: {error}</div>}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-600 mb-2">输出</h3>
            <pre className="font-mono text-xs bg-slate-50 p-3 rounded-lg overflow-x-auto">{JSON.stringify(result.data, null, 2)}</pre>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-600 mb-2">操作 ({result.redactions.length})</h3>
            <div className="space-y-1">
              {result.redactions.map((r, i) => (
                <div key={i} className="text-xs px-2 py-1 bg-violet-50 rounded flex justify-between">
                  <span className="font-mono text-slate-700">{r.field}</span>
                  <span className="text-violet-700">{r.kind} · {r.method}</span>
                </div>
              ))}
              {result.redactions.length === 0 && <p className="text-xs text-slate-400">无操作</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============== Export Tab ==============

function ExportTab({ tick }: { tick: number }) {
  void tick
  const [userId, setUserId] = useState('user-1')
  const [category, setCategory] = useState<DataCategory>('profile')
  const [payload, setPayload] = useState('{"name": "Alice", "age": 30}')

  const allCats: DataCategory[] = ['profile', 'content', 'transaction', 'behavior', 'communication', 'media', 'device', 'session', 'preference']
  const total = dataStore.totalFor(userId)
  const bundle = exporter.export(userId)

  const add = (): void => {
    try {
      const p = JSON.parse(payload)
      dataStore.put(userId, category, p)
    } catch (e) {
      alert(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">写入测试数据</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Field label="用户"><input value={userId} onChange={e => setUserId(e.target.value)} className={inputClass} /></Field>
          <Field label="类别">
            <select value={category} onChange={e => setCategory(e.target.value as DataCategory)} className={inputClass}>
              {allCats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label=" "><Btn onClick={add} variant="primary">添加</Btn></Field>
        </div>
        <Field label="数据 (JSON)"><textarea value={payload} onChange={e => setPayload(e.target.value)} className={`${inputClass} h-16 font-mono text-xs`} /></Field>
        <div className="mt-2 text-xs text-slate-500">该用户共 {total} 条记录</div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">GDPR 数据导出 (Art. 20)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
          {allCats.map(c => (
            <div key={c} className="border border-slate-200 rounded-lg p-2">
              <div className="text-slate-500">{c}</div>
              <div className="font-mono text-slate-700">{(bundle.data[c] ?? []).length} 条</div>
            </div>
          ))}
        </div>
        <pre className="font-mono text-[11px] bg-slate-50 p-3 rounded-lg max-h-80 overflow-y-auto">{JSON.stringify(bundle, null, 2).slice(0, 2000)}</pre>
        <div className="mt-2 text-[11px] text-slate-500">checksum: <span className="font-mono">{bundle.checksum}</span> · formatVersion: {bundle.formatVersion}</div>
      </div>
    </div>
  )
}

// ============== Eraser Tab ==============

function EraserTab({ tick }: { tick: number }) {
  void tick
  const [userId, setUserId] = useState('user-1')
  const [method, setMethod] = useState<'hard' | 'soft'>('hard')
  const [lastResult, setLastResult] = useState<ReturnType<typeof eraser.erase> | null>(null)

  const total = dataStore.totalFor(userId)

  const doErase = (): void => {
    const r = eraser.erase(userId, method)
    setLastResult(r)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">被遗忘权 (GDPR Art. 17)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Field label="用户"><input value={userId} onChange={e => setUserId(e.target.value)} className={inputClass} /></Field>
          <Field label="方式">
            <select value={method} onChange={e => setMethod(e.target.value as 'hard' | 'soft')} className={inputClass}>
              <option value="hard">hard (物理删除)</option>
              <option value="soft">soft (匿名化)</option>
            </select>
          </Field>
          <Field label=" "><Btn onClick={doErase} variant="primary">执行擦除</Btn></Field>
        </div>
        <div className="text-xs text-slate-500">该用户当前有 {total} 条记录</div>
      </div>

      {lastResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">擦除结果</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mb-3">
            {Object.entries(lastResult.deleted).map(([cat, n]) => (
              <div key={cat} className="border border-slate-200 rounded-lg p-2">
                <div className="text-slate-500">{cat}</div>
                <div className="font-mono text-green-600">-{n}</div>
              </div>
            ))}
            {Object.entries(lastResult.anonymized).filter(([_, n]) => n > 0).map(([cat, n]) => (
              <div key={cat} className="border border-slate-200 rounded-lg p-2">
                <div className="text-slate-500">{cat} (anon)</div>
                <div className="font-mono text-amber-600">~{n}</div>
              </div>
            ))}
          </div>
          <pre className="font-mono text-[11px] bg-slate-50 p-3 rounded-lg">{JSON.stringify(lastResult, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

// ============== Retention Tab ==============

function RetentionTab({ tick }: { tick: number }) {
  void tick
  const rules = retention.listRules()

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">数据保留策略 ({rules.length})</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-1">类别</th><th>保留 (天)</th><th>动作</th><th>法律依据</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.category} className="border-b border-slate-100">
                <td className="py-1 font-mono text-slate-700">{r.category}</td>
                <td>{r.retentionDays === 0 ? '∞' : r.retentionDays}</td>
                <td>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.action === 'delete' ? 'bg-red-100 text-red-700' : r.action === 'anonymize' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {r.action}
                  </span>
                </td>
                <td className="text-slate-500">{r.legalBasis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============== DSR Tab ==============

function DSRTab({ tick }: { tick: number }) {
  void tick
  const [userId, setUserId] = useState('user-1')
  const [type, setType] = useState<ReturnType<typeof dsrService.create>['type']>('access')

  const all = dsrService.list().slice(-10).reverse()

  const submit = (): void => {
    const r = dsrService.create(userId, type, 'submitted via UI')
    dsrService.process(r.id)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">提交 DSR (数据主体请求)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Field label="用户"><input value={userId} onChange={e => setUserId(e.target.value)} className={inputClass} /></Field>
          <Field label="类型">
            <select value={type} onChange={e => setType(e.target.value as typeof type)} className={inputClass}>
              <option value="access">access - 访问权</option>
              <option value="portability">portability - 数据可携</option>
              <option value="delete">delete - 被遗忘</option>
              <option value="rectify">rectify - 更正</option>
              <option value="restrict">restrict - 限制处理</option>
              <option value="object">object - 反对</option>
              <option value="opt-out">opt-out - 退出</option>
            </select>
          </Field>
          <Field label=" "><Btn onClick={submit} variant="primary">提交并处理</Btn></Field>
        </div>
        <div className="text-xs text-slate-500">SLA: 30 天 · 总请求: {dsrService.size()}</div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">最近 10 条</h2>
        <div className="space-y-1">
          {all.map(r => (
            <div key={r.id} className="border border-slate-200 rounded-lg p-2 text-xs">
              <div className="flex justify-between mb-1">
                <span className="font-mono text-slate-700">{r.type} · {r.userId}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-slate-500 text-[11px]">
                {new Date(r.createdAt).toISOString().slice(0, 19)} · 截止 {new Date(r.dueAt).toISOString().slice(0, 10)}
                {r.dueAt < Date.now() && r.status !== 'completed' && <span className="text-red-600 ml-2">⚠ 逾期</span>}
              </div>
              {r.bundle && <div className="text-[10px] text-slate-400 mt-1">bundle: {r.bundle.total} 条记录</div>}
              {r.erasureResult && <div className="text-[10px] text-slate-400 mt-1">erasure: {Object.values(r.erasureResult.deleted).reduce((s, n) => s + n, 0)} 条已删</div>}
            </div>
          ))}
          {all.length === 0 && <p className="text-xs text-slate-400">暂无</p>}
        </div>
      </div>
    </div>
  )
}

// ============== Cookie Tab ==============

function CookieTab({ tick }: { tick: number }) {
  void tick
  const [state, setState] = useState({ analytics: false, marketing: false, personalization: true, 'third-party': false, 'ai-training': false })
  const rec = cookieConsent.get('demo-user')

  const save = (): void => {
    cookieConsent.set('demo-user', {
      analytics: state.analytics ? 'granted' : 'denied',
      marketing: state.marketing ? 'granted' : 'denied',
      personalization: state.personalization ? 'granted' : 'denied',
      'third-party': state['third-party'] ? 'granted' : 'denied',
      'ai-training': state['ai-training'] ? 'granted' : 'denied',
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Cookie 同意横幅</h2>
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
            <div>
              <span className="font-mono text-sm">essential</span>
              <span className="text-xs text-slate-500 ml-2">必要 - 始终开启</span>
            </div>
            <span className="text-xs text-green-600">✓ 始终启用</span>
          </div>
          {(Object.keys(state) as Array<keyof typeof state>).map(k => (
            <label key={k} className="flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <span className="font-mono text-sm">{k}</span>
              <input type="checkbox" checked={state[k]} onChange={e => setState({ ...state, [k]: e.target.checked })} />
            </label>
          ))}
        </div>
        <Btn onClick={save} variant="primary">保存 Cookie 同意</Btn>
      </div>

      {rec && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">当前 Cookie 同意状态</h2>
          <div className="space-y-1 text-xs">
            {Object.entries(rec.categories).map(([k, v]) => (
              <div key={k} className="flex justify-between px-2 py-1 bg-slate-50 rounded">
                <span className="font-mono">{k}</span>
                <span className={v === 'granted' ? 'text-green-600' : 'text-red-600'}>{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">过期: {new Date(rec.expiresAt).toISOString().slice(0, 10)}</div>
        </div>
      )}
    </div>
  )
}

// ============== Metrics Tab ==============

function MetricsTab({ tick }: { tick: number }) {
  void tick
  const s = summarizePrivacy()
  const m = s.metrics

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="总同意" value={String(m.totalConsents)} />
        <Metric label="待办 DSR" value={String(s.pending)} color="text-amber-600" />
        <Metric label="已完成 DSR" value={String(m.completedDSRs)} />
        <Metric label="逾期 DSR" value={String(s.overdue)} color={s.overdue > 0 ? 'text-red-600' : 'text-slate-800'} />
        <Metric label="PII 遮蔽" value={String(m.totalPIIRedactions)} />
        <Metric label="擦除次数" value={String(m.totalErasures)} />
        <Metric label="保留规则" value={String(m.retentionRules)} />
        <Metric label="策略版本" value={m.policyVersion} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">持久化 (localStorage)</h2>
        <div className="flex gap-2 mb-2">
          <Btn onClick={() => { const n = persistPrivacy(); alert(`已持久化 ${n} 条同意`) }}>保存</Btn>
          <Btn onClick={() => { const r = loadPrivacy(); alert(`已加载 ${r.dsrCount} 条 DSR`) }}>读取</Btn>
        </div>
        <p className="text-[11px] text-slate-400">key: versa.privacy.v1</p>
      </div>
    </div>
  )
}

// ============== Sidebar ==============

function Sidebar({ tick }: { tick: number }) {
  void tick
  const s = summarizePrivacy()
  return (
    <aside className="space-y-3 text-xs">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">合规快照</h3>
        <Row k="总同意" v={String(s.consents)} />
        <Row k="DSR 总数" v={String(s.dsrs)} />
        <Row k="待办" v={String(s.pending)} />
        <Row k="逾期" v={String(s.overdue)} color={s.overdue > 0 ? 'text-red-600' : undefined} />
        <hr className="my-2 border-slate-100" />
        <Row k="PII 遮蔽" v={String(s.redactions)} />
        <Row k="擦除" v={String(s.metrics.totalErasures)} />
      </div>
      <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-2xl border border-violet-100 p-4">
        <h3 className="text-xs font-semibold text-violet-800 mb-1">v30.0 能力</h3>
        <ul className="text-[11px] text-violet-700 space-y-0.5">
          <li>· ConsentManager (5 类用途)</li>
          <li>· DataClassifier (10 种 PII)</li>
          <li>· Anonymizer (5 方法)</li>
          <li>· K-anonymity</li>
          <li>· GDPR 数据导出 Art.20</li>
          <li>· Eraser 被遗忘 Art.17</li>
          <li>· Retention 6 类规则</li>
          <li>· DSRService (7 种请求)</li>
          <li>· CookieConsent 横幅</li>
          <li>· 策略版本管理</li>
        </ul>
      </div>
    </aside>
  )
}

// ============== Shared UI ==============

function Row({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-500">{k}</span>
      <span className={`font-mono font-medium ${color ?? 'text-slate-800'}`}>{v}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Btn({ children, onClick, variant, disabled }: { children: React.ReactNode; onClick: () => void; variant?: 'primary'; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition disabled:opacity-50 ${
        variant === 'primary'
          ? 'bg-violet-600 text-white hover:bg-violet-700'
          : 'bg-white border border-slate-200 text-slate-700 hover:border-violet-300'
      }`}
    >
      {children}
    </button>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${color ?? 'text-slate-800'}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    granted: 'bg-green-100 text-green-700',
    denied: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    received: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    partial: 'bg-amber-100 text-amber-700',
    verifying: 'bg-cyan-100 text-cyan-700',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  )
}

const inputClass = 'w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-200 outline-none'

// ============== Seed data ==============

function seedDemo(): void {
  consents.setCurrentPolicy({ id: 'p1', version: '1.0.0', effectiveAt: Date.now(), summary: 'initial policy', text: '...' })
  consents.setCurrentPolicy({ id: 'p2', version: '1.1.0', effectiveAt: Date.now(), summary: 'added AI training', text: '...' })
  consents.grant('user-1', 'analytics', 'banner', '127.0.0.1', 'demo')
  consents.grant('user-1', 'personalization', 'banner', '127.0.0.1', 'demo')
  consents.deny('user-1', 'marketing', 'banner', '127.0.0.1', 'demo')

  dataStore.put('user-1', 'profile', { name: 'Alice Wang', email: 'alice@example.com', phone: '13800138000' })
  dataStore.put('user-1', 'transaction', { amount: 299, item: 'Pro plan' })
  dataStore.put('user-1', 'behavior', { lastLogin: '2026-06-01', pageViews: 42 })

  cookieConsent.set('user-1', { analytics: 'granted', marketing: 'denied', personalization: 'granted', 'third-party': 'denied', 'ai-training': 'denied' })
}
