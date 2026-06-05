/**
 * Versa · Realtime Demo Page (v21.0)
 */
import { useEffect, useState } from 'react'
import { Radio, Sparkles } from 'lucide-react'
import { realtime } from './index'
import { RealtimeChat, PresencePanel, LiveCursors, RealtimeStatusPanel } from './components'
import { Card, CardBody, CardHeader, Alert } from '../design-system/components'

export function RealtimePage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!realtime.isConnected()) {
      realtime.connect({ adapter: 'mock' }).then(() => setReady(true))
    } else {
      setReady(true)
    }
    return () => { /* keep alive across HMR */ }
  }, [])

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radio className="w-6 h-6 text-violet-500" /> 实时协作 <span className="text-sm font-normal text-ink-500">v21.0</span>
        </h1>
        <p className="text-sm text-ink-500 mt-1">WebSocket · SSE · Presence · Live Cursors</p>
      </header>

      {!ready ? (
        <Alert kind="info" title="正在连接…">实时通道初始化中</Alert>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <RealtimeChat />
            <LiveCursors />
          </div>
          <div className="space-y-4">
            <PresencePanel />
            <RealtimeStatusPanel />
            <CapabilitiesCard />
          </div>
        </div>
      )}
    </div>
  )
}

function CapabilitiesCard() {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" /> 实时层能力
        </h3>
      </CardHeader>
      <CardBody>
        <ul className="text-sm space-y-1.5">
          <li>✅ WebSocket 适配器 (自动重连 / 指数退避 / 心跳 / 离线队列)</li>
          <li>✅ SSE 适配器 (EventSource 封装)</li>
          <li>✅ Mock 适配器 (本地无后端演示)</li>
          <li>✅ 频道订阅 (Channel pub/sub)</li>
          <li>✅ Presence 在线状态 + 自动过期</li>
          <li>✅ 消息历史 (每频道 100 条)</li>
          <li>✅ React Hooks: useChannel / usePresence / useRealtimeState</li>
          <li>✅ 序列化: JSON (可扩展 protobuf)</li>
          <li>✅ 消息 ID + 时间戳 + 来源追踪</li>
        </ul>
      </CardBody>
    </Card>
  )
}
