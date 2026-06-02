import { Mic, MicOff, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

interface Props {
  onResult: (text: string) => void
  lang?: string
  className?: string
  size?: 'sm' | 'md'
}

export function VoiceInputButton({ onResult, lang = 'zh-CN', className, size = 'sm' }: Props) {
  const { supported, listening, transcript, start, stop, reset } = useSpeechRecognition(lang)

  if (!supported) return null

  const handleClick = () => {
    if (listening) {
      stop()
      if (transcript) {
        onResult(transcript)
        reset()
      }
    } else {
      start()
    }
  }

  const sizeCls = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11'
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        type="button"
        className={cn(
          sizeCls,
          'rounded-full p-0 inline-flex items-center justify-center transition',
          listening
            ? 'bg-rose-500 text-white animate-pulse'
            : 'hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500',
          className
        )}
        title={listening ? '点击停止并发送' : '语音输入'}
      >
        {listening ? <MicOff className={iconSize} /> : <Mic className={iconSize} />}
      </button>
      {listening && transcript && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-full bg-ink-900 text-white text-xs max-w-xs overflow-hidden text-ellipsis">
          🎙️ {transcript}
        </div>
      )}
    </div>
  )
}
