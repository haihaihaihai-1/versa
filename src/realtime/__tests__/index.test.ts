// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { realtime, type RealtimeMessage, type RealtimeState } from '../index'

beforeEach(async () => {
  realtime.disconnect()
  // 重置内部状态
  if (!realtime.isConnected()) {
    await realtime.connect({ adapter: 'mock' })
  }
})

afterEach(() => {
  realtime.disconnect()
})

describe('realtime · client', () => {
  it('连接后状态为 open', async () => {
    expect(realtime.isConnected()).toBe(true)
    expect(realtime.stats().state).toBe('open')
  })

  it('myId 唯一', () => {
    expect(realtime.myId).toMatch(/^user_/)
  })

  it('stats 返回正确字段', () => {
    const s = realtime.stats()
    expect(s).toHaveProperty('state')
    expect(s).toHaveProperty('channels')
    expect(s).toHaveProperty('myId')
  })

  it('disconnect 后状态变化', () => {
    realtime.disconnect()
    expect(realtime.isConnected()).toBe(false)
  })
})

describe('realtime · channel', () => {
  it('channel() 返回相同实例', () => {
    const a = realtime.channel('test')
    const b = realtime.channel('test')
    expect(a).toBe(b)
  })

  it('subscribe 收到 publish 的消息', () => {
    const ch = realtime.channel('ch-' + Date.now())
    let received: RealtimeMessage | null = null
    ch.subscribe((m) => { received = m })
    ch.publish('hello', { x: 1 })
    // mock echo 是 setTimeout 5ms
    return new Promise((r) => setTimeout(r, 30, undefined)).then(() => {
      expect(received).not.toBeNull()
      expect(received!.type).toBe('hello')
      expect(received!.data).toEqual({ x: 1 })
    })
  })

  it('publish 返回带 id+ts+from 的 message', () => {
    const ch = realtime.channel('ch-meta')
    const m = ch.publish('ping', null)
    expect(m.id).toMatch(/^msg_/)
    expect(m.ts).toBeGreaterThan(0)
    expect(m.from).toBe(realtime.myId)
    expect(m.channel).toBe('ch-meta')
  })

  it('unsubscribe', async () => {
    const ch = realtime.channel('ch-unsub')
    let count = 0
    const unsub = ch.subscribe(() => count++)
    ch.publish('a', null)
    await new Promise((r) => setTimeout(r, 20))
    unsub()
    ch.publish('b', null)
    await new Promise((r) => setTimeout(r, 20))
    expect(count).toBe(1)
  })

  it('history 累积', async () => {
    const ch = realtime.channel('ch-hist')
    ch.publish('1', null)
    ch.publish('2', null)
    ch.publish('3', null)
    await new Promise((r) => setTimeout(r, 20))
    expect(ch.history().length).toBeGreaterThanOrEqual(3)
  })

  it('history 上限 100', async () => {
    const ch = realtime.channel('ch-cap')
    for (let i = 0; i < 105; i++) ch.publish('msg', i)
    await new Promise((r) => setTimeout(r, 50))
    expect(ch.history().length).toBeLessThanOrEqual(100)
  })
})

describe('realtime · presence', () => {
  it('setPresence + getPresence', () => {
    const ch = realtime.channel('presence-test')
    ch.setPresence({ name: 'Alice', status: 'online' })
    const p = ch.getPresence() as any[]
    expect(p.length).toBe(1)
    expect(p[0].name).toBe('Alice')
  })

  it('getPresence(userId) 单独', () => {
    const ch = realtime.channel('presence-single')
    ch.setPresence({ name: 'Bob', status: 'busy' })
    const p = ch.getPresence(realtime.myId) as any
    expect(p.name).toBe('Bob')
  })

  it('offPresence 删除', async () => {
    const ch = realtime.channel('presence-off')
    ch.setPresence({ name: 'Carol' })
    ch.offPresence(realtime.myId)
    await new Promise((r) => setTimeout(r, 20))
    expect((ch.getPresence() as any[]).length).toBe(0)
  })

  it('presence:update 同步其他端', async () => {
    const ch = realtime.channel('presence-sync')
    ch.setPresence({ name: 'A' })
    await new Promise((r) => setTimeout(r, 20))
    // 模拟另一个客户端
    realtime.__inject({
      id: 'x', channel: 'presence-sync', type: 'presence:update',
      data: { name: 'Other', status: 'online' }, ts: Date.now(), from: 'other_user',
    })
    const p = ch.getPresence() as any[]
    expect(p.some((u) => u.name === 'Other')).toBe(true)
  })
})

describe('realtime · 注入', () => {
  it('__inject 投递消息到所有订阅者', () => {
    const ch = realtime.channel('inject-test')
    let got: RealtimeMessage | null = null
    ch.subscribe((m) => { got = m })
    realtime.__inject({
      id: 't1', channel: 'inject-test', type: 'injected',
      data: { foo: 'bar' }, ts: Date.now(),
    })
    expect(got).not.toBeNull()
    expect(got!.type).toBe('injected')
  })
})

describe('realtime · 状态变化', () => {
  it('onState 在 disconnect 触发', () => {
    const states: RealtimeState[] = []
    realtime.onState((s) => states.push(s))
    realtime.disconnect()
    expect(states.length).toBeGreaterThan(0)
  })
})
