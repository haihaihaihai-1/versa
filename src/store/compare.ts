// 商品对比 store - 最多 4 个商品
const KEY = 'versa:compare:v1'
const MAX = 4

type Listener = () => void
const listeners = new Set<Listener>()

function load(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function save(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {}
  listeners.forEach((l) => l())
}

function subscribe(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

let _ids: string[] | null = null

function getIds(): string[] {
  if (_ids === null) _ids = load()
  return _ids
}

export const compareStore = {
  get: (): string[] => getIds(),

  has(id: string): boolean {
    return getIds().includes(id)
  },

  add(id: string): { ok: boolean; reason?: string } {
    const ids = getIds()
    if (ids.includes(id)) return { ok: true }
    if (ids.length >= MAX) return { ok: false, reason: `最多对比 ${MAX} 件商品` }
    save([...ids, id])
    return { ok: true }
  },

  remove(id: string) {
    save(getIds().filter((x) => x !== id))
  },

  toggle(id: string): { ok: boolean; reason?: string; added?: boolean } {
    const ids = getIds()
    if (ids.includes(id)) {
      save(ids.filter((x) => x !== id))
      return { ok: true, added: false }
    }
    if (ids.length >= MAX) return { ok: false, reason: `最多对比 ${MAX} 件商品` }
    save([...ids, id])
    return { ok: true, added: true }
  },

  clear() {
    save([])
  },

  subscribe,
}

import { useEffect, useState } from 'react'
export function useCompare(): string[] {
  const [ids, setIds] = useState<string[]>(getIds())
  useEffect(() => {
    const refresh = () => {
      _ids = null
      setIds(getIds())
    }
    refresh()
    return compareStore.subscribe(refresh)
  }, [])
  return ids
}

export const COMPARE_LIMIT = MAX
