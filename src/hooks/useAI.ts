import { useState, useCallback, useRef, useEffect } from 'react'
import { chat, isAIEnabled, AIError, type ChatMessage, type ChatOptions } from '../lib/ai'

export interface UseAIReturn {
  loading: boolean
  error: string | null
  result: string
  history: ChatMessage[]
  enabled: boolean
  run: (userMsg: string, sysPrompt?: string, opts?: ChatOptions) => Promise<string | null>
  stream: (userMsg: string, sysPrompt?: string, opts?: Omit<ChatOptions, 'stream' | 'onChunk'>) => Promise<string | null>
  reset: () => void
  abort: () => void
}

export function useAI(initial: ChatMessage[] = []): UseAIReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>(initial)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const run = useCallback(
    async (userMsg: string, sysPrompt?: string, opts?: ChatOptions) => {
      setLoading(true)
      setError(null)
      setResult('')
      abortRef.current = new AbortController()

      const msgs: ChatMessage[] = [
        ...(sysPrompt ? [{ role: 'system' as const, content: sysPrompt }] : []),
        ...history,
        { role: 'user' as const, content: userMsg },
      ]
      try {
        const res = await chat(msgs, { ...opts, signal: abortRef.current.signal })
        setResult(res.content)
        setHistory((h) => [
          ...h,
          { role: 'user', content: userMsg },
          { role: 'assistant', content: res.content },
        ])
        return res.content
      } catch (e) {
        const msg =
          e instanceof AIError
            ? e.code === 'not_configured'
              ? 'AI 未配置（请设置 VITE_MIMO_API_KEY）'
              : `AI 错误: ${e.message}`
            : e instanceof Error
              ? e.message
              : '未知错误'
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [history]
  )

  const stream = useCallback(
    async (userMsg: string, sysPrompt?: string, opts?: Omit<ChatOptions, 'stream' | 'onChunk'>) => {
      setLoading(true)
      setError(null)
      setResult('')
      abortRef.current = new AbortController()

      const msgs: ChatMessage[] = [
        ...(sysPrompt ? [{ role: 'system' as const, content: sysPrompt }] : []),
        ...history,
        { role: 'user' as const, content: userMsg },
      ]
      let acc = ''
      try {
        const res = await chat(msgs, {
          ...opts,
          stream: true,
          signal: abortRef.current.signal,
          onChunk: (chunk) => {
            acc += chunk
            setResult(acc)
          },
        })
        setHistory((h) => [
          ...h,
          { role: 'user', content: userMsg },
          { role: 'assistant', content: res.content },
        ])
        return res.content
      } catch (e) {
        const msg =
          e instanceof AIError
            ? e.code === 'not_configured'
              ? 'AI 未配置（请设置 VITE_MIMO_API_KEY）'
              : `AI 错误: ${e.message}`
            : e instanceof Error
              ? e.message
              : '未知错误'
        setError(msg)
        return null
      } finally {
        setLoading(false)
      }
    },
    [history]
  )

  const reset = useCallback(() => {
    setResult('')
    setError(null)
    setHistory([])
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { loading, error, result, history, enabled: isAIEnabled(), run, stream, reset, abort }
}
