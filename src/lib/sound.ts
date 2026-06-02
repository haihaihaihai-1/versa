import { useEffect, useRef } from 'react'

type SoundType = 'success' | 'error' | 'info' | 'gift' | 'click' | 'notification'

const Frequencies: Record<SoundType, number[]> = {
  success: [523.25, 659.25, 783.99], // C5, E5, G5
  error: [220, 207.65], // A3, G#3
  info: [440, 554.37], // A4, C#5
  gift: [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6
  click: [880], // A5
  notification: [659.25, 783.99], // E5, G5
}

let audioContext: AudioContext | null = null
let enabled = false

export function enableSound() {
  enabled = true
  try {
    localStorage.setItem('versa:sound-enabled', 'true')
  } catch {}
}

export function disableSound() {
  enabled = false
  try {
    localStorage.setItem('versa:sound-enabled', 'false')
  } catch {}
}

export function isSoundEnabled() {
  if (enabled) return true
  try {
    return localStorage.getItem('versa:sound-enabled') === 'true'
  } catch {
    return false
  }
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
    if (!Ctx) return null
    audioContext = new Ctx()
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {})
  return audioContext
}

export function playSound(type: SoundType = 'click', volume = 0.1) {
  if (!isSoundEnabled()) return
  const ctx = getContext()
  if (!ctx) return
  const freqs = Frequencies[type]
  const noteDuration = 0.12
  const gap = 0.04

  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    const start = ctx.currentTime + i * (noteDuration + gap)
    const stop = start + noteDuration
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(volume, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, stop)
    osc.start(start)
    osc.stop(stop + 0.01)
  })
}

export function useSoundTrigger(type: SoundType) {
  const played = useRef(false)
  useEffect(() => {
    if (played.current) return
    played.current = true
    playSound(type)
  }, [type])
}
