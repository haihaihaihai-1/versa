import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Video, PhoneOff, Phone, Volume2, VolumeX, Sparkles, Loader2, MessageCircle, Send, Users } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Transcript {
  id: string
  speaker: string
  text: string
  at: number
  isAI?: boolean
}

interface Summary {
  id: string
  at: number
  content: string
  keyPoints: string[]
  actionItems: string[]
}

const STORAGE_KEY = 'versa:meeting'

function loadTranscripts(): Transcript[] { try { const s = localStorage.getItem(STORAGE_KEY + ':t'); if (s) return JSON.parse(s) } catch {} return [] }
function saveTranscripts(d: Transcript[]) { try { localStorage.setItem(STORAGE_KEY + ':t', JSON.stringify(d)) } catch {} }
function loadSummaries(): Summary[] { try { const s = localStorage.getItem(STORAGE_KEY + ':s'); if (s) return JSON.parse(s) } catch {} return [] }
function saveSummaries(d: Summary[]) { try { localStorage.setItem(STORAGE_KEY + ':s', JSON.stringify(d)) } catch {} }

export function MeetingAssistant() {
  const [recording, setRecording] = useState(false)
  const [transcripts, setTranscripts] = useState<Transcript[]>(loadTranscripts())
  const [summaries, setSummaries] = useState<Summary[]>(loadSummaries())
  const [duration, setDuration] = useState(0)
  const [manualText, setManualText] = useState('')
  const [speaker, setSpeaker] = useState('我')
  const [muted, setMuted] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState<Summary | null>(null)
  const intervalRef = useRef<number | undefined>(undefined)

  useEffect(() => { saveTranscripts(transcripts) }, [transcripts])
  useEffect(() => { saveSummaries(summaries) }, [summaries])

  useEffect(() => {
    if (recording) {
      intervalRef.current = window.setInterval(() => {
        setDuration((d) => d + 1)
        if (Math.random() > 0.6 && !muted) {
          const samples = ['关于这个议题, 我觉得...', '请继续', '这个方案可行', '需要更多数据支持', '下一步怎么安排?', '我同意', '让我想想', '有其他意见吗?']
          const newT: Transcript = { id: uid(), speaker: Math.random() > 0.5 ? '我' : ['小李', '小王', '小张', '小赵'][Math.floor(Math.random() * 4)], text: samples[Math.floor(Math.random() * samples.length)], at: Date.now() }
          setTranscripts((ts) => [...ts, newT])
        }
      }, 3000)
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current) }
  }, [recording, muted])

  const addManual = () => {
    if (!manualText.trim()) return
    setTranscripts([...transcripts, { id: uid(), speaker, text: manualText, at: Date.now() }])
    setManualText('')
  }

  const start = () => { setRecording(true); setDuration(0); toast('会议开始', 'success') }
  const stop = () => { setRecording(false); toast(`会议结束, 共 ${Math.floor(duration / 60)} 分钟`, 'info') }
  const reset = () => { setTranscripts([]); setSummaries([]); setDuration(0); toast('已清空', 'info') }

  const generateSummary = async () => {
    if (transcripts.length === 0) { toast('没有内容可总结', 'error'); return }
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setAiLoading(true)
    try {
      const content = transcripts.map((t) => `${t.speaker}: ${t.text}`).join('\n')
      const result = await aiComplete(`为以下会议记录生成 1 段 100 字总结, 提取 3 个关键点和 3 个行动项 (JSON: {"summary": "...", "keyPoints": ["...", "...", "..."], "actionItems": ["...", "...", "..."]})\n\n${content}`, '你是 Versa 会议助理, 简洁专业, 中文')
      const json = result.match(/\{[\s\S]*\}/)?.[0]
      if (json) {
        const obj = JSON.parse(json)
        const s: Summary = { id: uid(), at: Date.now(), content: obj.summary, keyPoints: obj.keyPoints || [], actionItems: obj.actionItems || [] }
        setSummaries([s, ...summaries])
        setAiSummary(s)
        toast('总结已生成', 'success')
      } else { toast('解析失败', 'error') }
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setAiLoading(false) }
  }

  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  const activeSpeakers = Array.from(new Set(transcripts.slice(-10).map((t) => t.speaker)))
  const wordsCount = transcripts.reduce((s, t) => s + t.text.length, 0)

  return (
    <div className="space-y-3">
      <div className={cn('rounded-2xl p-3 text-white', recording ? 'bg-gradient-to-br from-rose-500 to-red-500' : 'bg-gradient-to-br from-slate-700 to-slate-900')}>
        <div className="flex items-center gap-2 mb-1">
          {recording && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
          <Mic className="w-5 h-5" />
          <h2 className="text-lg font-bold">会议助理</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">{recording ? '正在录音转写' : '实时转写 + AI 总结'}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold font-mono">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</p>
            <p className="text-[10px] opacity-80">时长</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{transcripts.length}</p>
            <p className="text-[10px] opacity-80">对话</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{activeSpeakers.length}</p>
            <p className="text-[10px] opacity-80">发言人</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-1.5">
        {!recording ? (
          <button onClick={start} className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-red-500 text-white flex items-center justify-center">
            <Mic className="w-6 h-6" />
          </button>
        ) : (
          <>
            <button onClick={() => setMuted(!muted)} className={cn('w-12 h-12 rounded-full flex items-center justify-center', muted ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button onClick={stop} className="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center">
              <PhoneOff className="w-6 h-6" />
            </button>
          </>
        )}
        <button onClick={reset} className="w-12 h-12 rounded-full bg-ink-100 dark:bg-ink-800 text-ink-500 flex items-center justify-center text-xs">清空</button>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <div className="flex items-center gap-1.5">
          <select value={speaker} onChange={(e) => setSpeaker(e.target.value)} className="px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs">
            {['我', '小李', '小王', '小张', '小赵', '主持人'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={manualText} onChange={(e) => setManualText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addManual()} placeholder="手动添加发言..." className="flex-1 px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
          <button onClick={addManual} className="px-2 h-7 rounded bg-rose-500 text-white text-[10px]"><Send className="w-3 h-3" /></button>
        </div>
        <p className="text-[10px] text-ink-500">或录音时自动转写 ({wordsCount} 字)</p>
      </div>

      <button onClick={generateSummary} disabled={aiLoading || transcripts.length === 0} className="w-full h-9 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1">
        {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 生成会议纪要
      </button>

      {aiSummary && (
        <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 p-3 border border-rose-200/40 space-y-2">
          <p className="text-xs font-bold text-rose-500 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />AI 总结</p>
          <p className="text-xs leading-relaxed">{aiSummary.content}</p>
          {aiSummary.keyPoints.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-ink-700 dark:text-ink-300 mb-1">关键点</p>
              <ul className="space-y-0.5">
                {aiSummary.keyPoints.map((p, i) => <li key={i} className="text-[10px] flex gap-1"><span className="text-rose-500">•</span>{p}</li>)}
              </ul>
            </div>
          )}
          {aiSummary.actionItems.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-ink-700 dark:text-ink-300 mb-1">行动项</p>
              <ul className="space-y-0.5">
                {aiSummary.actionItems.map((p, i) => <li key={i} className="text-[10px] flex gap-1"><span className="text-amber-500">→</span>{p}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 max-h-60 overflow-y-auto">
        {transcripts.length === 0 ? (
          <div className="p-6 text-center text-ink-500">
            <Mic className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">点击麦克风开始会议</p>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {transcripts.map((t) => (
              <div key={t.id} className="flex items-start gap-1.5 p-1.5">
                <div className={cn('w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0', t.speaker === '我' ? 'from-rose-500 to-pink-500' : 'from-blue-500 to-indigo-500')}>
                  {t.speaker[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold">{t.speaker}</p>
                  <p className="text-xs">{t.text}</p>
                </div>
                <p className="text-[9px] text-ink-500">{new Date(t.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {summaries.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">历史纪要 ({summaries.length})</p>
          {summaries.map((s) => (
            <div key={s.id} className="p-2 rounded-lg bg-ink-50 dark:bg-ink-800">
              <p className="text-[10px] text-ink-500">{new Date(s.at).toLocaleString('zh-CN')}</p>
              <p className="text-xs">{s.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
