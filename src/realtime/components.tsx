/**
 * Versa · 实时协作 UI (v21.0)
 * - 在线用户列表
 * - 实时消息流
 * - Live Cursor (鼠标位置广播)
 * - 频道状态
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { Users, Send, Wifi, WifiOff, Circle, MousePointer2 } from 'lucide-react'
import { realtime, useChannel, usePresence, useRealtimeState, type PresenceInfo, type RealtimeMessage } from './index'
import { Button, Input, Avatar, Badge, Card, CardBody, CardHeader, Alert } from '../design-system/components'
import { cn } from '../lib/utils'

interface ChatMessage extends RealtimeMessage<{ text: string; name: string }> {}

// ============== 实时聊天 ==============

export function RealtimeChat() {
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const channel = realtime.channel('chat:general')
  const presence = usePresence('chat:general')
  const state = useRealtimeState()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = channel.subscribe((m) => {
      if (m.type === 'message') setMessages((xs) => [...xs, m as ChatMessage].slice(-100))
    })
    return unsub
  }, [channel])

  // 初始化: 设置 presence
  useEffect(() => {
    channel.setPresence({ name: '访客' + realtime.myId.slice(-4), status: 'online' })
  }, [channel])

  // 自动滚动
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const send = useCallback(() => {
    if (!text.trim()) return
    channel.publish('message', { text: text.trim(), name: 'Me' })
    setText('')
  }, [text, channel])

  return (
    <Card>
      <CardHeader>
        <HStack>
          <h3 className="font-semibold flex items-center gap-2">
            <Send className="w-4 h-4" /> 实时聊天
          </h3>
          <Badge tone={state === 'open' ? 'success' : 'warning'}>
            {state === 'open' ? '● 已连接' : '○ 未连接'}
          </Badge>
          <Spacer />
          <span className="text-xs text-ink-500">{presence.length} 人在线</span>
        </HStack>
      </CardHeader>
      <CardBody>
        <div ref={listRef} className="h-64 overflow-y-auto mb-3 p-2 rounded-lg bg-ink-50 dark:bg-ink-800/30 space-y-1.5">
          {messages.length === 0 ? (
            <div className="text-center text-xs text-ink-400 py-8">暂无消息,说点什么?</div>
          ) : messages.map((m) => (
            <div key={m.id} className="flex gap-2 text-sm">
              <div className="font-semibold text-violet-500 shrink-0">{m.data.name}:</div>
              <div className="flex-1">{m.data.text}</div>
              <div className="text-[10px] text-ink-400 shrink-0">
                {new Date(m.ts).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
        <HStack>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="输入消息…"
            leftIcon={<Send className="w-4 h-4" />}
          />
          <Button onClick={send}>发送</Button>
        </HStack>
      </CardBody>
    </Card>
  )
}

function HStack({ className, children }: { className?: string; children: any }) {
  return <div className={cn('flex flex-row items-center gap-2', className)}>{children}</div>
}
function Spacer() { return <div className="flex-1" /> }

// ============== 在线用户面板 ==============

export function PresencePanel() {
  const users = usePresence('chat:general')
  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" /> 在线 ({users.length})
        </h3>
      </CardHeader>
      <CardBody className="space-y-2">
        {users.length === 0 ? (
          <div className="text-xs text-ink-400 text-center py-4">等待用户加入…</div>
        ) : users.map((u, i) => (
          <HStack key={u.userId || i} className="p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/50">
            <Avatar name={u.name || 'Anon'} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{u.name}</div>
              <div className="text-[10px] text-ink-500 flex items-center gap-1">
                <Circle className={cn('w-2 h-2', u.status === 'online' ? 'fill-emerald-500 text-emerald-500' : 'fill-ink-400 text-ink-400')} />
                {u.status || 'online'}
              </div>
            </div>
          </HStack>
        ))}
      </CardBody>
    </Card>
  )
}

// ============== Live Cursors ==============

export function LiveCursors() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number; name: string }>>({})
  const channel = realtime.channel('cursors:demo')

  useEffect(() => {
    const unsub = channel.subscribe((m) => {
      if (m.type === 'cursor' && m.data) {
        setCursors((cs) => ({ ...cs, [m.from!]: { x: m.data.x, y: m.data.y, name: m.data.name } }))
      } else if (m.type === 'cursor:leave' && m.from) {
        setCursors((cs) => {
          const { [m.from!]: _, ...rest } = cs
          return rest
        })
      }
    })
    return () => {
      channel.publish('cursor:leave', {})
      unsub()
    }
  }, [channel])

  const onMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    channel.publish('cursor', { x, y, name: '用户' + realtime.myId.slice(-3) })
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold flex items-center gap-2">
          <MousePointer2 className="w-4 h-4" /> Live Cursors
        </h3>
      </CardHeader>
      <CardBody>
        <div
          ref={containerRef}
          onMouseMove={onMove}
          className="relative h-64 rounded-xl bg-gradient-to-br from-violet-100/50 to-blue-100/50 dark:from-violet-900/20 dark:to-blue-900/20 overflow-hidden cursor-crosshair"
        >
          <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-400">
            移动鼠标广播位置
          </div>
          {Object.entries(cursors).map(([id, c]) => (
            <div
              key={id}
              className="absolute pointer-events-none transition-all duration-200 ease-out"
              style={{ left: c.x + '%', top: c.y + '%' }}
            >
              <MousePointer2 className="w-4 h-4 text-violet-500 -translate-x-1 -translate-y-1" />
              <div className="mt-0.5 ml-2 px-1.5 py-0.5 rounded bg-violet-500 text-white text-[10px] whitespace-nowrap">
                {c.name}
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

// ============== 状态面板 ==============

export function RealtimeStatusPanel() {
  const [state, setState] = useState(realtime.stats().state)
  const [stats, setStats] = useState(realtime.stats())
  useEffect(() => realtime.onState(setState), [])
  useEffect(() => {
    const t = setInterval(() => setStats(realtime.stats()), 2000)
    return () => clearInterval(t)
  }, [])

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold flex items-center gap-2">
          {state === 'open' ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-rose-500" />}
          实时连接
        </h3>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-ink-500">状态</div>
            <div className="font-mono mt-1">{state}</div>
          </div>
          <div>
            <div className="text-xs text-ink-500">我的 ID</div>
            <div className="font-mono mt-1 text-xs">{stats.myId}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-ink-500">活跃频道</div>
            <div className="font-mono mt-1">{stats.channels}</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {state === 'open' ? (
            <Button size="sm" variant="outline" onClick={() => realtime.disconnect()}>断开</Button>
          ) : (
            <Button size="sm" onClick={() => realtime.connect()}>连接</Button>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
