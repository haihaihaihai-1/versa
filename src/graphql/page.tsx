/**
 * Versa · GraphQL Playground (v24.0)
 * - SDL viewer
 * - Query editor + Execute
 * - Schema browser
 * - Subscription demo
 */
import { useState, useEffect, useRef } from 'react'
import { Zap, Play, Code2, Database, Radio, FileCode } from 'lucide-react'
import {
  Card, CardBody, CardHeader, Tabs, Button, Input, Badge, Alert, HStack, Spacer,
} from '../design-system/components'
import { schema, execute, type GraphQLResult, mockDBExport } from './index'
import { cn } from '../lib/utils'

const SAMPLES: { name: string; query: string }[] = [
  {
    name: '所有用户 + 帖子',
    query: `query {
  users {
    id
    name
    email
    posts {
      id
      title
      likes
    }
  }
}`,
  },
  {
    name: '单用户详情',
    query: `query {
  user(id: "u1") {
    name
    email
    role
    posts {
      title
      text
      likes
    }
  }
}`,
  },
  {
    name: '创建帖子 (mutation)',
    query: `mutation {
  createPost(text: "New post from playground", authorId: "u1", title: "Playground") {
    id
    title
    text
    likes
  }
}`,
  },
  {
    name: '点赞',
    query: `mutation {
  likePost(id: "p1") {
    id
    likes
  }
}`,
  },
  {
    name: 'Me + 帖子',
    query: `query {
  me {
    name
    role
    posts {
      id
      title
    }
  }
  now
}`,
  },
  {
    name: '内联片段',
    query: `query {
  posts {
    id
    title
    ... on Post {
      likes
      comments {
        text
        author { name }
      }
    }
  }
}`,
  },
]

export function GraphQLPage() {
  const [tab, setTab] = useState<'playground' | 'schema' | 'browser' | 'subscription'>('playground')
  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="w-6 h-6 text-violet-500" /> GraphQL Gateway <span className="text-sm font-normal text-ink-500">v24.0</span>
        </h1>
        <p className="text-sm text-ink-500 mt-1">Schema · Resolver · Parser · Executor · DataLoader · Subscriptions</p>
      </header>

      <nav className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'playground', label: <><Play className="w-3.5 h-3.5" /> Playground</> },
            { value: 'schema', label: <><Code2 className="w-3.5 h-3.5" /> SDL</> },
            { value: 'browser', label: <><Database className="w-3.5 h-3.5" /> Browser</> },
            { value: 'subscription', label: <><Radio className="w-3.5 h-3.5" /> Subscription</> },
          ]}
          variant="underline"
        />
      </nav>

      {tab === 'playground' && <Playground />}
      {tab === 'schema' && <SchemaView />}
      {tab === 'browser' && <BrowserView />}
      {tab === 'subscription' && <SubscriptionView />}
    </div>
  )
}

function Playground() {
  const [query, setQuery] = useState(SAMPLES[0].query)
  const [result, setResult] = useState<GraphQLResult | null>(null)
  const [duration, setDuration] = useState(0)
  const [running, setRunning] = useState(false)

  const onRun = async () => {
    setRunning(true)
    const start = performance.now()
    const r = await execute(schema, query)
    setResult(r)
    setDuration(performance.now() - start)
    setRunning(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <HStack>
            <h3 className="font-semibold">示例查询</h3>
            <Spacer />
            <Badge>{query.split('\n').length} 行</Badge>
          </HStack>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((s) => (
              <Button key={s.name} size="sm" variant="outline" onClick={() => setQuery(s.query)}>
                {s.name}
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <HStack>
            <h3 className="font-semibold flex items-center gap-2"><FileCode className="w-4 h-4" /> Query</h3>
            <Spacer />
            <Button onClick={onRun} loading={running} leftIcon={<Play className="w-3.5 h-3.5" />}>
              Execute
            </Button>
          </HStack>
        </CardHeader>
        <CardBody>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-40 px-3 py-2 rounded-xl bg-ink-950 text-ink-100 font-mono text-xs outline-none"
          />
        </CardBody>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <HStack>
              <h3 className="font-semibold">Result</h3>
              <Badge tone={result.errors ? 'danger' : 'success'}>
                {result.errors ? `❌ ${result.errors.length} errors` : '✅ OK'}
              </Badge>
              <Badge tone="neutral">{duration.toFixed(2)}ms</Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <pre className="p-3 rounded-lg bg-ink-50 dark:bg-ink-800/30 text-xs overflow-x-auto max-h-96 overflow-y-auto">
              <code>{JSON.stringify(result, null, 2)}</code>
            </pre>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function SchemaView() {
  const sdl = schema.toSDL()
  const [copied, setCopied] = useState(false)
  return (
    <Card>
      <CardHeader>
        <HStack>
          <h3 className="font-semibold">Schema (SDL)</h3>
          <Spacer />
          <Button
            size="sm"
            variant="outline"
            onClick={() => { navigator.clipboard.writeText(sdl); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          >
            {copied ? '✅ Copied' : 'Copy'}
          </Button>
        </HStack>
      </CardHeader>
      <CardBody>
        <pre className="p-3 rounded-lg bg-ink-950 text-ink-100 font-mono text-xs overflow-x-auto max-h-[600px]">
          <code>{sdl}</code>
        </pre>
      </CardBody>
    </Card>
  )
}

function BrowserView() {
  const intro = schema.introspect()
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Introspection</h3>
        </CardHeader>
        <CardBody>
          <pre className="p-3 rounded-lg bg-ink-950 text-ink-100 font-mono text-xs overflow-x-auto max-h-[600px]">
            <code>{JSON.stringify(intro, null, 2)}</code>
          </pre>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h3 className="font-semibold flex items-center gap-2"><Database className="w-4 h-4" /> Mock DB</h3>
        </CardHeader>
        <CardBody>
          <div className="grid md:grid-cols-2 gap-3 text-xs">
            <DbTable name="users" data={mockDBExport.users} />
            <DbTable name="posts" data={mockDBExport.posts} />
            <DbTable name="comments" data={mockDBExport.comments} />
            <DbTable name="products" data={mockDBExport.products} />
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function DbTable({ name, data }: { name: string; data: any[] }) {
  return (
    <div className="p-2 rounded-lg bg-ink-50 dark:bg-ink-800/30">
      <div className="font-semibold mb-1">{name} ({data.length})</div>
      <pre className="text-[10px] font-mono overflow-x-auto max-h-40">
        {JSON.stringify(data.slice(0, 3), null, 2)}
      </pre>
    </div>
  )
}

function SubscriptionView() {
  const [events, setEvents] = useState<{ ts: number; type: string; data: any }[]>([])
  const [running, setRunning] = useState(false)
  const timer = useRef<any>(null)

  useEffect(() => {
    if (!running) return
    const tick = async () => {
      // 直接读取 mockDB
      setEvents((xs) => [
        { ts: Date.now(), type: 'ping', data: { t: Math.floor(Date.now() / 1000) % 100 } },
        ...xs,
      ].slice(0, 30))
    }
    timer.current = setInterval(tick, 2000)
    return () => clearInterval(timer.current)
  }, [running])

  return (
    <Card>
      <CardHeader>
        <HStack>
          <h3 className="font-semibold flex items-center gap-2"><Radio className="w-4 h-4" /> 订阅模拟</h3>
          <Spacer />
          <Button onClick={() => setRunning(!running)} variant={running ? 'danger' : 'solid'}>
            {running ? '停止' : '开始'}
          </Button>
        </HStack>
      </CardHeader>
      <CardBody>
        <p className="text-xs text-ink-500 mb-3">
          订阅是基于 async iterator 实现的 GraphQL Subscription,这里用轮询模拟推送。
        </p>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-4">{running ? '等待事件…' : '点击开始'}</p>
          ) : events.map((e, i) => (
            <div key={i} className="p-2 rounded-lg bg-ink-50 dark:bg-ink-800/30 text-xs font-mono flex items-center gap-2">
              <Badge tone="info">{e.type}</Badge>
              <span className="text-ink-400">{new Date(e.ts).toLocaleTimeString()}</span>
              <span>{JSON.stringify(e.data)}</span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}
