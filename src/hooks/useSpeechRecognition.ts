import { useState, useCallback, useRef, useEffect } from 'react'

interface UseSpeechReturn {
  supported: boolean
  listening: boolean
  transcript: string
  start: () => void
  stop: () => void
  reset: () => void
}

export function useSpeechRecognition(lang = 'zh-CN'): UseSpeechReturn {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<any>(null)

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR) {
      setSupported(true)
      const rec = new SR()
      rec.lang = lang
      rec.interimResults = true
      rec.continuous = false
      rec.onresult = (e: any) => {
        let text = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          text += e.results[i][0].transcript
        }
        setTranscript(text)
      }
      rec.onerror = () => setListening(false)
      rec.onend = () => setListening(false)
      recRef.current = rec
    }
    return () => {
      try { recRef.current?.abort() } catch { /* ignore */ }
    }
  }, [lang])

  const start = useCallback(() => {
    if (!recRef.current) return
    setTranscript('')
    setListening(true)
    recRef.current.start()
  }, [])

  const stop = useCallback(() => {
    if (!recRef.current) return
    setListening(false)
    recRef.current.stop()
  }, [])

  const reset = useCallback(() => setTranscript(''), [])

  return { supported, listening, transcript, start, stop, reset }
}
