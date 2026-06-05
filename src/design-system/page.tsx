/**
 * Versa · Design System Demo Page (v19.0)
 * 完整组件展示 + 主题切换 + 可复制代码片段
 */
import { useState } from 'react'
import {
  Palette, Type, Square, Layers, Sparkles, Check, Copy, Sun, Moon,
  AlertTriangle, Info, AlertCircle, Search, Mail, Star, Heart, Trash2,
} from 'lucide-react'
import { colors, spacing, radius, shadow, motion, fontSize } from './tokens'
import {
  Button, Input, Textarea, Card, CardHeader, CardBody, CardFooter,
  Modal, Tabs, Badge, Avatar, Spinner, Skeleton, Alert, EmptyState,
  Divider, HStack, VStack, Spacer, ToastProvider, useToast,
} from './components'

export function DesignSystemPage() {
  const [tab, setTab] = useState<'overview' | 'tokens' | 'components' | 'playground'>('overview')
  const [showModal, setShowModal] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [email, setEmail] = useState('')

  return (
    <ToastProvider>
      <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-500" /> Versa Design System <span className="text-sm font-normal text-ink-500">v19.0</span>
          </h1>
          <p className="text-sm text-ink-500 mt-1">设计令牌 · 组件库 · 主题</p>
        </header>

        <nav className="mb-6">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'overview', label: <><Palette className="w-3.5 h-3.5" /> 概览</> },
              { value: 'tokens', label: <><Type className="w-3.5 h-3.5" /> 设计令牌</> },
              { value: 'components', label: <><Square className="w-3.5 h-3.5" /> 组件</> },
              { value: 'playground', label: <><Layers className="w-3.5 h-3.5" /> 演练场</> },
            ]}
            variant="underline"
          />
        </nav>

        {tab === 'overview' && <Overview />}
        {tab === 'tokens' && <TokensPanel />}
        {tab === 'components' && (
          <ComponentsPanel
            showModal={showModal}
            setShowModal={setShowModal}
            inputVal={inputVal}
            setInputVal={setInputVal}
            email={email}
            setEmail={setEmail}
          />
        )}
        {tab === 'playground' && <Playground />}
      </div>
    </ToastProvider>
  )
}

function Overview() {
  return (
    <div className="space-y-6">
      <Alert kind="info" title="关于设计系统">
        Versa Design System 是所有 UI 组件的单一来源。设计令牌、组件库、主题、暗色模式都集中在这里管理。
      </Alert>

      <Card>
        <CardHeader><h2 className="font-semibold">设计原则</h2></CardHeader>
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: '一致性', desc: '所有 UI 共享同一套 token,避免视觉漂移' },
              { title: '可访问性', desc: 'WCAG 2.2 AA 标准,键盘可达,语义化' },
              { title: '主题感知', desc: '内置 light/dark,所有颜色自动适配' },
              { title: '零配置', desc: '默认值即最佳实践,无需要传 props' },
              { title: '可组合', desc: '组件基于 cn() 工具,可灵活组合' },
              { title: '测试覆盖', desc: '每个组件都有单测验证交互' },
            ].map((p) => (
              <div key={p.title} className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50">
                <div className="font-semibold text-sm">{p.title}</div>
                <p className="text-xs text-ink-500 mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">快速上手</h2></CardHeader>
        <CardBody>
          <CodeBlock code={`import { Button, Card, CardBody, Badge } from '@/design-system/components'
import { colors, spacing } from '@/design-system/tokens'

<Button variant="solid" leftIcon={<Check />}>确认</Button>
<Badge tone="success">已支付</Badge>`} />
        </CardBody>
      </Card>
    </div>
  )
}

function TokensPanel() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><h2 className="font-semibold">颜色 (Color Tokens)</h2></CardHeader>
        <CardBody>
          {Object.entries(colors).map(([name, scale]) => (
            <div key={name} className="mb-4">
              <div className="text-sm font-semibold capitalize mb-2">{name}</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(scale as Record<string, string>).map(([shade, hex]) => (
                  <div key={shade} className="flex flex-col items-center">
                    <div
                      className="w-12 h-12 rounded-lg border border-ink-200/50 dark:border-ink-700/50"
                      style={{ backgroundColor: hex }}
                    />
                    <div className="text-[10px] font-mono mt-1 text-ink-500">{shade}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">字号 (Typography)</h2></CardHeader>
        <CardBody>
          {Object.entries(fontSize).map(([size, [fs]]) => (
            <div key={size} className="flex items-baseline gap-4 py-1">
              <div className="w-12 text-xs text-ink-500 font-mono">{size}</div>
              <div style={{ fontSize: fs }}>Versa · {size} ({fs})</div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">间距 (Spacing)</h2></CardHeader>
        <CardBody>
          <div className="space-y-1">
            {Object.entries(spacing).filter(([k]) => !isNaN(Number(k))).slice(0, 12).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 text-xs">
                <div className="w-10 text-ink-500 font-mono">{k}</div>
                <div className="w-16 text-ink-400 font-mono">{v}</div>
                <div className="h-2 rounded bg-violet-500" style={{ width: v as string }} />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">圆角 (Radius)</h2></CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            {Object.entries(radius).map(([k, v]) => (
              <div key={k} className="text-center">
                <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30" style={{ borderRadius: v as string }} />
                <div className="text-[10px] font-mono mt-1 text-ink-500">{k}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">阴影 (Shadow)</h2></CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-6">
            {Object.entries(shadow).map(([k, v]) => (
              <div key={k} className="text-center">
                <div className="w-20 h-20 bg-white dark:bg-ink-900 rounded-xl" style={{ boxShadow: v as string }} />
                <div className="text-[10px] font-mono mt-2 text-ink-500">{k}</div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">动效 (Motion)</h2></CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {Object.entries(motion.duration).map(([k, v]) => (
              <div key={k} className="flex justify-between p-2 rounded-lg bg-ink-50 dark:bg-ink-800/50">
                <span className="font-mono">duration.{k}</span>
                <span className="text-ink-500">{v}</span>
              </div>
            ))}
            {Object.entries(motion.easing).map(([k, v]) => (
              <div key={k} className="flex justify-between p-2 rounded-lg bg-ink-50 dark:bg-ink-800/50">
                <span className="font-mono">easing.{k}</span>
                <span className="text-ink-500 truncate ml-2">{v}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function ComponentsPanel({
  showModal, setShowModal, inputVal, setInputVal, email, setEmail,
}: { showModal: boolean; setShowModal: (v: boolean) => void; inputVal: string; setInputVal: (v: string) => void; email: string; setEmail: (v: string) => void }) {
  const { toast } = useToast()
  const [demoTab, setDemoTab] = useState('a')
  return (
    <div className="space-y-6">
      {/* Button */}
      <Section title="Button" icon={Square}>
        <div className="flex flex-wrap gap-2">
          <Button>Solid</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="link">Link</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <Divider className="my-3" />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">XS</Button>
          <Button size="sm">SM</Button>
          <Button size="md">MD</Button>
          <Button size="lg">LG</Button>
          <Divider orientation="vertical" className="h-6" />
          <Button loading>加载中</Button>
          <Button leftIcon={<Check />}>带左图标</Button>
          <Button rightIcon={<Trash2 />} variant="danger">删除</Button>
        </div>
      </Section>

      {/* Input */}
      <Section title="Input" icon={Square}>
        <div className="grid md:grid-cols-2 gap-3">
          <Input placeholder="基础输入" value={inputVal} onChange={(e) => setInputVal(e.target.value)} />
          <Input placeholder="无效状态" invalid value="错误内容" readOnly />
          <Input placeholder="带图标" leftIcon={<Search className="w-4 h-4" />} />
          <Input type="email" placeholder="邮箱" leftIcon={<Mail className="w-4 h-4" />} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Divider className="my-3" />
        <Textarea placeholder="多行文本..." rows={3} />
      </Section>

      {/* Card */}
      <Section title="Card" icon={Square}>
        <div className="grid md:grid-cols-2 gap-3">
          <Card>
            <CardHeader><h3 className="font-semibold">标题</h3></CardHeader>
            <CardBody><p className="text-sm text-ink-500">卡片正文内容...</p></CardBody>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="ghost" size="sm">取消</Button>
              <Button size="sm">确认</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardBody>
              <HStack>
                <Avatar name="Alice" />
                <VStack className="gap-0">
                  <div className="font-semibold text-sm">Alice</div>
                  <div className="text-xs text-ink-500">产品经理</div>
                </VStack>
                <Spacer />
                <Badge tone="success">在线</Badge>
              </HStack>
              <Divider className="my-3" />
              <p className="text-sm">这个人最近发布了 5 篇优质内容...</p>
            </CardBody>
          </Card>
        </div>
      </Section>

      {/* Badge / Avatar */}
      <Section title="Badge & Avatar" icon={Square}>
        <HStack className="flex-wrap">
          <Badge>Neutral</Badge>
          <Badge tone="primary">Primary</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="info">Info</Badge>
        </HStack>
        <Divider className="my-3" />
        <HStack>
          <Avatar name="Alice" size="sm" />
          <Avatar name="Bob" size="md" />
          <Avatar name="Charlie" size="lg" />
          <Avatar name="D" size="md" />
          <Avatar name="赵" size="md" />
        </HStack>
      </Section>

      {/* Tabs */}
      <Section title="Tabs" icon={Square}>
        <Tabs
          value={demoTab} onChange={setDemoTab}
          items={[
            { value: 'a', label: '全部', badge: <Badge tone="info">12</Badge> },
            { value: 'b', label: '已完成' },
            { value: 'c', label: '进行中', badge: <Badge tone="warning">3</Badge> },
          ]}
        />
      </Section>

      {/* Alert */}
      <Section title="Alert" icon={Square}>
        <VStack>
          <Alert kind="info" title="提示">这是一条普通信息</Alert>
          <Alert kind="success" title="成功">操作已完成</Alert>
          <Alert kind="warning" title="警告">请检查输入</Alert>
          <Alert kind="error" title="错误">系统异常,请重试</Alert>
        </VStack>
      </Section>

      {/* Toast */}
      <Section title="Toast" icon={Square}>
        <HStack className="flex-wrap">
          <Button size="sm" onClick={() => toast({ kind: 'success', message: '操作成功!' })}>成功</Button>
          <Button size="sm" variant="danger" onClick={() => toast({ kind: 'error', message: '失败,请重试' })}>错误</Button>
          <Button size="sm" variant="outline" onClick={() => toast({ kind: 'info', message: '这是一条提示' })}>提示</Button>
          <Button size="sm" variant="soft" onClick={() => toast({ kind: 'warning', message: '请注意!' })}>警告</Button>
        </HStack>
      </Section>

      {/* Modal */}
      <Section title="Modal" icon={Square}>
        <Button onClick={() => setShowModal(true)}>打开 Modal</Button>
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="确认操作"
          footer={<><Button variant="ghost" onClick={() => setShowModal(false)}>取消</Button><Button onClick={() => setShowModal(false)}>确认</Button></>}
        >
          <p className="text-sm">确定要执行此操作吗?此操作不可撤销。</p>
        </Modal>
      </Section>

      {/* Loading States */}
      <Section title="Loading States" icon={Square}>
        <HStack>
          <Spinner />
          <Spinner size={24} />
          <Spinner size={32} />
          <Divider orientation="vertical" className="h-8" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </HStack>
      </Section>

      {/* Empty */}
      <Section title="Empty State" icon={Square}>
        <Card>
          <EmptyState
            icon={Search}
            title="未找到结果"
            description="试试调整搜索条件,或浏览热门分类"
            action={<Button>浏览全部</Button>}
          />
        </Card>
      </Section>
    </div>
  )
}

function Playground() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="font-semibold">自定义演示</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-ink-500 mb-4">这里可以用任意组合快速搭建原型。</p>
          <HStack className="flex-wrap gap-3">
            <Button variant="solid" leftIcon={<Star />}>收藏</Button>
            <Button variant="danger" leftIcon={<Heart />}>喜欢</Button>
            <Button variant="outline" leftIcon={<Copy />}>复制</Button>
            <Button variant="ghost" leftIcon={<Trash2 />}>删除</Button>
          </HStack>
          <Divider className="my-4" />
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { title: '数据卡片', tone: 'primary' as const, count: '1,234' },
              { title: '成功操作', tone: 'success' as const, count: '98%' },
              { title: '告警数量', tone: 'warning' as const, count: '5' },
            ].map((s) => (
              <Card key={s.title}>
                <CardBody>
                  <HStack>
                    <VStack className="gap-0">
                      <div className="text-xs text-ink-500">{s.title}</div>
                      <div className="text-2xl font-bold mt-1">{s.count}</div>
                    </VStack>
                    <Spacer />
                    <Badge tone={s.tone}>{s.title}</Badge>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">主题切换</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-ink-500 mb-3">系统根据 OS 偏好自动切换 light/dark,所有组件自动适配。</p>
          <HStack className="gap-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50">
              <Sun className="w-4 h-4" /> Light
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-ink-900 text-white">
              <Moon className="w-4 h-4" /> Dark
            </div>
          </HStack>
        </CardBody>
      </Card>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-violet-500" />} {title}
        </h2>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  )
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative">
      <pre className="p-3 rounded-xl bg-ink-950 text-ink-100 text-xs overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-ink-800 hover:bg-ink-700 text-ink-300"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

export { colors, spacing, radius, shadow, motion, fontSize }
export * from './components'
