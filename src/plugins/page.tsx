/**
 * Versa · Plugin Marketplace Page (v23.0)
 * - 已安装插件管理
 * - 市场浏览 / 搜索
 * - 事件总线调试
 * - 沙箱代码测试
 */
import { useEffect, useState } from 'react'
import { Puzzle, Store, Activity, Play, Download, Trash2, Power, Search, Code2 } from 'lucide-react'
import {
  Card, CardBody, CardHeader, Tabs, Button, Input, Badge, Alert, HStack, Spacer,
} from '../design-system/components'
import {
  pluginRegistry, marketplace, eventBus, runSandboxedSync, defaultPluginAPI,
  type Plugin, type PluginManifest, type MarketplaceEntry, type PluginPermission,
} from './index'
import { cn } from '../lib/utils'

export function PluginsPage() {
  const [tab, setTab] = useState<'installed' | 'marketplace' | 'sandbox' | 'events'>('installed')
  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Puzzle className="w-6 h-6 text-violet-500" /> 插件系统 <span className="text-sm font-normal text-ink-500">v23.0</span>
        </h1>
        <p className="text-sm text-ink-500 mt-1">注册表 · 沙箱 · 事件总线 · 市场</p>
      </header>

      <nav className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'installed', label: <><Puzzle className="w-3.5 h-3.5" /> 已安装</> },
            { value: 'marketplace', label: <><Store className="w-3.5 h-3.5" /> 市场</> },
            { value: 'sandbox', label: <><Code2 className="w-3.5 h-3.5" /> 沙箱</> },
            { value: 'events', label: <><Activity className="w-3.5 h-3.5" /> 事件</> },
          ]}
          variant="underline"
        />
      </nav>

      {tab === 'installed' && <InstalledPanel />}
      {tab === 'marketplace' && <MarketplacePanel />}
      {tab === 'sandbox' && <SandboxPanel />}
      {tab === 'events' && <EventsPanel />}
    </div>
  )
}

function InstalledPanel() {
  const [plugins, setPlugins] = useState<Plugin[]>(pluginRegistry.list())
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')

  useEffect(() => pluginRegistry.subscribe(() => setPlugins(pluginRegistry.list())), [])

  const onInstall = () => {
    if (!newId || !newName) return
    pluginRegistry.install({
      id: newId, name: newName, version: '1.0.0', author: 'me',
      description: '手动安装', permissions: ['storage.read', 'storage.write'],
    })
    setNewId(''); setNewName('')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><h3 className="font-semibold">手动安装</h3></CardHeader>
        <CardBody>
          <HStack>
            <Input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="plugin-id (kebab-case)" />
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="显示名称" />
            <Button onClick={onInstall} leftIcon={<Download className="w-3.5 h-3.5" />}>安装</Button>
          </HStack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold">已安装 ({plugins.length})</h3>
        </CardHeader>
        <CardBody>
          {plugins.length === 0 ? (
            <p className="text-sm text-ink-500">暂无插件</p>
          ) : (
            <div className="space-y-2">
              {plugins.map((p) => (
                <div key={p.manifest.id} className="p-3 rounded-xl border border-ink-200/50 dark:border-ink-700/50">
                  <HStack>
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-nova-500 flex items-center justify-center text-white font-bold">
                      {p.manifest.name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{p.manifest.name}</div>
                      <div className="text-xs text-ink-500 font-mono">{p.manifest.id} · v{p.manifest.version} · by {p.manifest.author}</div>
                    </div>
                    <Spacer />
                    <Badge tone={p.status === 'enabled' ? 'success' : p.status === 'error' ? 'danger' : 'neutral'}>
                      {p.status}
                    </Badge>
                    {p.status === 'enabled' ? (
                      <Button size="sm" variant="ghost" onClick={() => pluginRegistry.disable(p.manifest.id)}>
                        <Power className="w-3.5 h-3.5" />
                      </Button>
                    ) : p.status === 'installed' || p.status === 'disabled' ? (
                      <Button size="sm" variant="ghost" onClick={() => pluginRegistry.enable(p.manifest.id, defaultPluginAPI)}>
                        <Power className="w-3.5 h-3.5" />
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => pluginRegistry.uninstall(p.manifest.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </Button>
                  </HStack>
                  {p.error && <div className="mt-2 text-xs text-rose-500 font-mono">⚠️ {p.error}</div>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.manifest.permissions.map((perm) => (
                      <Badge key={perm} tone="info" className="text-[10px]">{perm}</Badge>
                    ))}
                  </div>
                  {p.metrics.calls > 0 && (
                    <div className="mt-2 text-[10px] text-ink-500 font-mono">
                      调用 {p.metrics.calls} 次 · 错误 {p.metrics.errors} · 平均 {p.metrics.avgLatencyMs.toFixed(2)}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function MarketplacePanel() {
  const [query, setQuery] = useState('')
  const [installed, setInstalled] = useState<Set<string>>(new Set())

  const results = marketplace.search(query)

  const onInstall = (e: MarketplaceEntry) => {
    marketplace.install(e.id)
    setInstalled(new Set(marketplace.search().map((x) => x.id)))  // refresh
    pluginRegistry.install({
      id: e.id, name: e.name, version: e.version, author: e.author,
      description: e.description, permissions: ['storage.read', 'storage.write'],
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <HStack>
            <Search className="w-4 h-4 text-ink-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索插件..." />
            <Spacer />
            <Badge>{results.length} 个结果</Badge>
          </HStack>
        </CardHeader>
        <CardBody>
          <div className="grid md:grid-cols-2 gap-3">
            {results.map((e) => (
              <div key={e.id} className="p-3 rounded-xl border border-ink-200/50 dark:border-ink-700/50">
                <HStack>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-nova-500 flex items-center justify-center text-white font-bold text-lg">
                    {e.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{e.name}</div>
                    <div className="text-xs text-ink-500">v{e.version} · by {e.author}</div>
                  </div>
                  {marketplace.isInstalled(e.id) ? (
                    <Badge tone="success">已安装</Badge>
                  ) : (
                    <Button size="sm" onClick={() => onInstall(e)}>安装</Button>
                  )}
                </HStack>
                <p className="mt-2 text-xs text-ink-500 line-clamp-2">{e.description}</p>
                <HStack className="mt-2 text-[10px] text-ink-400 flex-wrap">
                  <span>⭐ {e.rating} ({e.ratingCount})</span>
                  <span>↓ {e.downloads.toLocaleString()}</span>
                  {e.tags.map((t) => <Badge key={t} tone="neutral" className="text-[10px]">{t}</Badge>)}
                </HStack>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function SandboxPanel() {
  const [code, setCode] = useState(`// 沙箱测试: 输出 hello
return { msg: 'Hello from sandbox!', ts: Date.now() }`)
  const [result, setResult] = useState<{ ok: boolean; value?: any; error?: string; durationMs: number } | null>(null)

  const onRun = () => {
    const r = runSandboxedSync(code, defaultPluginAPI)
    setResult(r)
  }

  return (
    <div className="space-y-4">
      <Alert kind="info" title="沙箱执行">
        插件代码在 Function 构造器创建的隔离作用域中运行,只能访问声明的 API (storage/events/analytics/log),无法访问外层闭包。
      </Alert>
      <Card>
        <CardHeader>
          <HStack>
            <h3 className="font-semibold flex items-center gap-2"><Code2 className="w-4 h-4" /> 代码编辑器</h3>
            <Spacer />
            <Button onClick={onRun} leftIcon={<Play className="w-3.5 h-3.5" />}>执行</Button>
          </HStack>
        </CardHeader>
        <CardBody>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-40 px-3 py-2 rounded-xl bg-ink-950 text-ink-100 font-mono text-xs outline-none"
          />
        </CardBody>
      </Card>
      {result && (
        <Card>
          <CardHeader>
            <HStack>
              <h3 className="font-semibold">执行结果</h3>
              <Badge tone={result.ok ? 'success' : 'danger'}>{result.ok ? '✅ 成功' : '❌ 失败'}</Badge>
              <Badge tone="neutral">{result.durationMs}ms</Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <pre className="p-3 rounded-lg bg-ink-50 dark:bg-ink-800/30 text-xs overflow-x-auto">
              {result.error
                ? <span className="text-rose-500">Error: {result.error}</span>
                : <span className="text-emerald-500">{JSON.stringify(result.value, null, 2)}</span>
              }
            </pre>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function EventsPanel() {
  const [history, setHistory] = useState(eventBus.getHistory())
  const [event, setEvent] = useState('')
  const [data, setData] = useState('')

  useEffect(() => {
    const t = setInterval(() => setHistory(eventBus.getHistory()), 1000)
    return () => clearInterval(t)
  }, [])

  const onPublish = () => {
    let parsed: any = data
    try { parsed = JSON.parse(data) } catch {}
    eventBus.publish(event || 'test', parsed)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><h3 className="font-semibold">发布事件</h3></CardHeader>
        <CardBody>
          <HStack>
            <Input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="event name" />
            <Input value={data} onChange={(e) => setData(e.target.value)} placeholder="data (JSON)" />
            <Button onClick={onPublish}>发布</Button>
          </HStack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="font-semibold">事件历史 ({history.length})</h3></CardHeader>
        <CardBody>
          {history.length === 0 ? (
            <p className="text-sm text-ink-500">暂无事件</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {history.slice().reverse().map((h, i) => (
                <div key={i} className="p-2 rounded-lg bg-ink-50 dark:bg-ink-800/30 text-xs font-mono">
                  <div className="flex gap-2 items-center">
                    <Badge tone="info">{h.event}</Badge>
                    <span className="text-ink-400">{new Date(h.ts).toLocaleTimeString()}</span>
                    {h.from && <span className="text-violet-500">from: {h.from}</span>}
                  </div>
                  <pre className="mt-1 text-ink-700 dark:text-ink-300 overflow-x-auto">
                    {JSON.stringify(h.data)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
