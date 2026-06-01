import { Sparkles, Plus, MessageCircle } from 'lucide-react'
import { formatNumber } from '../../lib/utils'
import type { Author } from '../../data/types'

export function AuthorBio({ author, articleCount = 0, totalReads = 0 }: { author: Author; articleCount?: number; totalReads?: number }) {
  return (
    <div className="rounded-2xl border border-ink-200/60 dark:border-ink-800/60 bg-gradient-to-br from-news-500/5 to-nova-500/5 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <img src={author.avatar} alt={author.name} className="w-14 h-14 rounded-2xl ring-2 ring-white dark:ring-ink-900" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-base">{author.name}</h4>
              {author.verified && <Sparkles className="w-3.5 h-3.5 text-news-500" />}
            </div>
            <p className="text-xs text-ink-500 mt-0.5">特约撰稿人</p>
            {author.bio && (
              <p className="text-sm text-ink-700 dark:text-ink-200 mt-2 line-clamp-2">{author.bio}</p>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="py-2 rounded-lg bg-white/60 dark:bg-ink-900/40">
            <div className="text-base font-bold tabular-nums">{articleCount}</div>
            <div className="text-[10px] text-ink-500">文章</div>
          </div>
          <div className="py-2 rounded-lg bg-white/60 dark:bg-ink-900/40">
            <div className="text-base font-bold tabular-nums">{formatNumber(totalReads)}</div>
            <div className="text-[10px] text-ink-500">阅读</div>
          </div>
          <div className="py-2 rounded-lg bg-white/60 dark:bg-ink-900/40">
            <div className="text-base font-bold tabular-nums">{formatNumber(author.followers || 0)}</div>
            <div className="text-[10px] text-ink-500">粉丝</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-news-500 text-white text-sm font-medium hover:bg-news-600 transition-colors">
            <Plus className="w-4 h-4" /> 关注
          </button>
          <button className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-ink-200 dark:border-ink-800 text-sm font-medium hover:bg-ink-50 dark:hover:bg-ink-900/40 transition-colors">
            <MessageCircle className="w-4 h-4" /> 私信
          </button>
        </div>
      </div>
    </div>
  )
}
