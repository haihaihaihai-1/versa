import { useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, Check, X } from 'lucide-react'
import { cn } from '../lib/utils'

export type Lang = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko'

interface Translation {
  [key: string]: { [K in Lang]: string }
}

const T: Translation = {
  home: { 'zh-CN': '首页', 'zh-TW': '首頁', en: 'Home', ja: 'ホーム', ko: '홈' },
  shop: { 'zh-CN': '购物', 'zh-TW': '購物', en: 'Shop', ja: 'ショップ', ko: '쇼핑' },
  news: { 'zh-CN': '资讯', 'zh-TW': '資訊', en: 'News', ja: 'ニュース', ko: '뉴스' },
  debate: { 'zh-CN': '辩论', 'zh-TW': '辯論', en: 'Debate', ja: '討論', ko: '토론' },
  live: { 'zh-CN': '直播', 'zh-TW': '直播', en: 'Live', ja: 'ライブ', ko: '라이브' },
  search: { 'zh-CN': '搜索', 'zh-TW': '搜尋', en: 'Search', ja: '検索', ko: '검색' },
  cart: { 'zh-CN': '购物车', 'zh-TW': '購物車', en: 'Cart', ja: 'カート', ko: '장바구니' },
  profile: { 'zh-CN': '个人中心', 'zh-TW': '個人中心', en: 'Profile', ja: 'プロフィール', ko: '프로필' },
  settings: { 'zh-CN': '设置', 'zh-TW': '設定', en: 'Settings', ja: '設定', ko: '설정' },
  notifications: { 'zh-CN': '通知', 'zh-TW': '通知', en: 'Notifications', ja: '通知', ko: '알림' },
  messages: { 'zh-CN': '消息', 'zh-TW': '訊息', en: 'Messages', ja: 'メッセージ', ko: '메시지' },
  login: { 'zh-CN': '登录', 'zh-TW': '登入', en: 'Sign In', ja: 'ログイン', ko: '로그인' },
  logout: { 'zh-CN': '退出登录', 'zh-TW': '退出登入', en: 'Sign Out', ja: 'ログアウト', ko: '로그아웃' },
  publish: { 'zh-CN': '发布', 'zh-TW': '發布', en: 'Publish', ja: '公開', ko: '게시' },
  like: { 'zh-CN': '点赞', 'zh-TW': '按讚', en: 'Like', ja: 'いいね', ko: '좋아요' },
  comment: { 'zh-CN': '评论', 'zh-TW': '評論', en: 'Comment', ja: 'コメント', ko: '댓글' },
  share: { 'zh-CN': '分享', 'zh-TW': '分享', en: 'Share', ja: '共有', ko: '공유' },
  follow: { 'zh-CN': '关注', 'zh-TW': '追蹤', en: 'Follow', ja: 'フォロー', ko: '팔로우' },
  following: { 'zh-CN': '已关注', 'zh-TW': '已追蹤', en: 'Following', ja: 'フォロー中', ko: '팔로잉' },
  followers: { 'zh-CN': '粉丝', 'zh-TW': '粉絲', en: 'Followers', ja: 'フォロワー', ko: '팔로워' },
  hello: { 'zh-CN': '你好', 'zh-TW': '你好', en: 'Hello', ja: 'こんにちは', ko: '안녕하세요' },
  addToCart: { 'zh-CN': '加入购物车', 'zh-TW': '加入購物車', en: 'Add to Cart', ja: 'カートに追加', ko: '장바구니 추가' },
  buyNow: { 'zh-CN': '立即购买', 'zh-TW': '立即購買', en: 'Buy Now', ja: '今すぐ購入', ko: '바로 구매' },
  freeShipping: { 'zh-CN': '包邮', 'zh-TW': '免運費', en: 'Free Shipping', ja: '送料無料', ko: '무료 배송' },
  reviews: { 'zh-CN': '评价', 'zh-TW': '評價', en: 'Reviews', ja: 'レビュー', ko: '리뷰' },
  questions: { 'zh-CN': '问答', 'zh-TW': '問答', en: 'Q&A', ja: 'Q&A', ko: 'Q&A' },
  description: { 'zh-CN': '详情', 'zh-TW': '詳情', en: 'Description', ja: '詳細', ko: '상세' },
  specs: { 'zh-CN': '规格', 'zh-TW': '規格', en: 'Specs', ja: '仕様', ko: '사양' },
  save: { 'zh-CN': '保存', 'zh-TW': '儲存', en: 'Save', ja: '保存', ko: '저장' },
  cancel: { 'zh-CN': '取消', 'zh-TW': '取消', en: 'Cancel', ja: 'キャンセル', ko: '취소' },
  confirm: { 'zh-CN': '确认', 'zh-TW': '確認', en: 'Confirm', ja: '確認', ko: '확인' },
  delete: { 'zh-CN': '删除', 'zh-TW': '刪除', en: 'Delete', ja: '削除', ko: '삭제' },
  edit: { 'zh-CN': '编辑', 'zh-TW': '編輯', en: 'Edit', ja: '編集', ko: '편집' },
  loading: { 'zh-CN': '加载中…', 'zh-TW': '載入中…', en: 'Loading…', ja: '読み込み中…', ko: '로딩 중…' },
  noData: { 'zh-CN': '暂无数据', 'zh-TW': '暫無資料', en: 'No data', ja: 'データなし', ko: '데이터 없음' },
}

export function t(key: string, lang: Lang = 'zh-CN'): string {
  return T[key]?.[lang] || T[key]?.['zh-CN'] || key
}

const LANG_LABELS: Record<Lang, { label: string; flag: string }> = {
  'zh-CN': { label: '简体中文', flag: '🇨🇳' },
  'zh-TW': { label: '繁體中文', flag: '🇭🇰' },
  en: { label: 'English', flag: '🇺🇸' },
  ja: { label: '日本語', flag: '🇯🇵' },
  ko: { label: '한국어', flag: '🇰🇷' },
}

const STORAGE_KEY = 'versa:lang'

export function getLang(): Lang {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Lang) || 'zh-CN'
  } catch { return 'zh-CN' }
}

export function setLang(l: Lang) {
  try { localStorage.setItem(STORAGE_KEY, l) } catch {}
  window.dispatchEvent(new CustomEvent('versa:lang-change', { detail: l }))
}

export function LanguageSwitcher({ onChange }: { onChange?: (lang: Lang) => void }) {
  const [lang, setLocalLang] = useState<Lang>(() => getLang())
  const [open, setOpen] = useState(false)

  useState(() => {
    if (typeof window === 'undefined') return
    const handler = (e: Event) => {
      const l = (e as CustomEvent<Lang>).detail
      setLocalLang(l)
    }
    window.addEventListener('versa:lang-change', handler)
    return () => window.removeEventListener('versa:lang-change', handler)
  })

  const select = (l: Lang) => {
    setLocalLang(l)
    setLang(l)
    setOpen(false)
    onChange?.(l)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-2.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 flex items-center gap-1.5 transition"
        title="语言"
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm">{LANG_LABELS[lang].flag}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-xl z-50 overflow-hidden">
          {Object.entries(LANG_LABELS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => select(k as Lang)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-ink-100 dark:hover:bg-ink-800',
                lang === k && 'bg-nova-50 dark:bg-nova-900/30 text-nova-600'
              )}
            >
              <span className="text-lg">{v.flag}</span>
              <span className="flex-1">{v.label}</span>
              {lang === k && <Check className="w-4 h-4 text-nova-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
