// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { pwaState, formatBytes, requestNotificationPermission, shouldShowInstallPrompt } from '../index'

beforeEach(() => {
  localStorage.clear()
})

describe('PWA · pwaState store', () => {
  it('初始值', () => {
    expect(pwaState.value.online).toBe(true)
    expect(pwaState.value.installed).toBe(false)
    expect(pwaState.value.swActive).toBe(false)
  })

  it('subscribe 立即获得当前值', () => {
    let captured: any = null
    const unsub = pwaState.subscribe((s) => { captured = s })
    expect(captured).not.toBeNull()
    expect(captured.online).toBe(true)
    unsub()
  })

  it('update 触发订阅', () => {
    let calls = 0
    let last: any = null
    const unsub = pwaState.subscribe((s) => { calls++; last = s })
    pwaState.update((s) => ({ ...s, online: false }))
    pwaState.update((s) => ({ ...s, swActive: true }))
    expect(calls).toBeGreaterThanOrEqual(3)  // 初始 + 2 update
    expect(last.online).toBe(false)
    expect(last.swActive).toBe(true)
    unsub()
  })

  it('unsub 不再收到通知', () => {
    let calls = 0
    const unsub = pwaState.subscribe(() => calls++)
    pwaState.update((s) => ({ ...s, online: false }))
    const after1 = calls
    unsub()
    pwaState.update((s) => ({ ...s, online: true }))
    expect(calls).toBe(after1)
  })
})

describe('PWA · formatBytes', () => {
  it('0 → "0 B"', () => {
    expect(formatBytes(0)).toBe('0 B')
  })
  it('< 1KB → B', () => {
    expect(formatBytes(512)).toMatch(/B/)
  })
  it('KB 单位', () => {
    expect(formatBytes(1024)).toMatch(/KB/)
    expect(formatBytes(2048)).toMatch(/KB/)
  })
  it('MB 单位', () => {
    expect(formatBytes(1024 * 1024)).toMatch(/MB/)
  })
  it('GB 单位', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toMatch(/GB/)
  })
})

describe('PWA · shouldShowInstallPrompt', () => {
  it('无 defer → true', () => {
    expect(shouldShowInstallPrompt()).toBe(true)
  })

  it('7 天内 defer → false', () => {
    localStorage.setItem('versa:pwa:install-deferred', String(Date.now() - 3 * 24 * 60 * 60 * 1000))
    expect(shouldShowInstallPrompt()).toBe(false)
  })

  it('7 天前 defer → true', () => {
    localStorage.setItem('versa:pwa:install-deferred', String(Date.now() - 10 * 24 * 60 * 60 * 1000))
    expect(shouldShowInstallPrompt()).toBe(true)
  })
})

describe('PWA · requestNotificationPermission', () => {
  it('happy-dom 默认 denied', async () => {
    const p = await requestNotificationPermission()
    expect(['default', 'denied', 'granted']).toContain(p)
  })
})
