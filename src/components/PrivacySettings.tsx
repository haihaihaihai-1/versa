import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Lock, Eye, EyeOff, Bell, MessageCircle, User, UserX, Trash2, AlertTriangle, Save, Check, Phone, AtSign, Heart } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

const SECTIONS = [
  { key: 'profile', label: '资料可见', icon: Eye },
  { key: 'online', label: '在线状态', icon: MessageCircle },
  { key: 'notif', label: '通知设置', icon: Bell },
  { key: 'blacklist', label: '黑名单', icon: UserX },
  { key: 'data', label: '数据与隐私', icon: Lock },
  { key: 'delete', label: '账号注销', icon: Trash2 },
] as const

const BLACKLIST_SEED = [
  { id: 'b1', name: '骚扰用户 A', avatar: 'https://i.pravatar.cc/100?img=12', blockedAt: Date.now() - 86400000 * 5 },
  { id: 'b2', name: '广告号 B', avatar: 'https://i.pravatar.cc/100?img=23', blockedAt: Date.now() - 86400000 * 12 },
]

const SETTINGS_KEY = 'versa:privacy-settings'
const BL_KEY = 'versa:blacklist'

const DEFAULT_SETTINGS = {
  profile: { showAvatar: true, showBio: true, showOrders: false, showWishlist: false, allowDM: true },
  online: { showOnline: true, showLastSeen: true, allowStrangers: false, allowInvite: true },
  notif: { push: true, email: true, sms: false, likes: true, comments: true, follows: true, live: true, debatel: true, marketing: false },
}

function loadSettings() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY)
    if (s) return JSON.parse(s)
  } catch {}
  return DEFAULT_SETTINGS
}

function saveSettings(s: typeof DEFAULT_SETTINGS) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) } catch {}
}

function loadBlacklist() {
  try {
    const s = localStorage.getItem(BL_KEY)
    if (s) return JSON.parse(s)
  } catch {}
  return BLACKLIST_SEED
}

function saveBlacklist(b: typeof BLACKLIST_SEED) {
  try { localStorage.setItem(BL_KEY, JSON.stringify(b)) } catch {}
}

export function PrivacySettings() {
  const [active, setActive] = useState<typeof SECTIONS[number]['key']>('profile')
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [blacklist, setBlacklist] = useState(BLACKLIST_SEED)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    setBlacklist(loadBlacklist())
  }, [])

  useEffect(() => { saveSettings(settings) }, [settings])
  useEffect(() => { saveBlacklist(blacklist) }, [blacklist])

  const toggle = (section: keyof typeof DEFAULT_SETTINGS, key: string) => {
    setSettings((s) => ({
      ...s,
      [section]: { ...s[section], [key]: !(s[section] as any)[key] },
    }))
    toast('设置已保存', 'success')
  }

  const unblock = (id: string) => {
    setBlacklist((b) => b.filter((u) => u.id !== id))
    toast('已解除黑名单', 'success')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-ink-900 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5" />
          <h2 className="text-lg font-bold">隐私设置</h2>
        </div>
        <p className="text-xs opacity-90">掌控你的数据, 保护你的隐私</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={cn('px-3 h-7 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0', active === s.key ? 'bg-slate-700 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600')}
          >
            <s.icon className="w-3 h-3" />{s.label}
          </button>
        ))}
      </div>

      {active === 'profile' && (
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 divide-y divide-ink-100 dark:divide-ink-800">
          {[
            { key: 'showAvatar', label: '显示头像', desc: '在个人页显示头像' },
            { key: 'showBio', label: '显示简介', desc: '向其他用户展示个人简介' },
            { key: 'showOrders', label: '显示购买记录', desc: '关注者可见你买过什么' },
            { key: 'showWishlist', label: '显示收藏夹', desc: '关注者可见你的收藏' },
            { key: 'allowDM', label: '允许私信', desc: '陌生人给你发消息' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-[10px] text-ink-500">{item.desc}</p>
              </div>
              <Toggle on={(settings.profile as any)[item.key]} onChange={() => toggle('profile', item.key)} />
            </div>
          ))}
        </div>
      )}

      {active === 'online' && (
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 divide-y divide-ink-100 dark:divide-ink-800">
          {[
            { key: 'showOnline', label: '显示在线', desc: '在线时显示绿点' },
            { key: 'showLastSeen', label: '显示最后在线', desc: '展示最后活跃时间' },
            { key: 'allowStrangers', label: '允许陌生人查看', desc: '陌生人可看你的主页' },
            { key: 'allowInvite', label: '允许群聊邀请', desc: '接受群聊邀请' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-[10px] text-ink-500">{item.desc}</p>
              </div>
              <Toggle on={(settings.online as any)[item.key]} onChange={() => toggle('online', item.key)} />
            </div>
          ))}
        </div>
      )}

      {active === 'notif' && (
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 divide-y divide-ink-100 dark:divide-ink-800">
          {[
            { key: 'push', label: '推送通知', desc: 'App 推送' },
            { key: 'email', label: '邮件通知', desc: '重要更新邮件' },
            { key: 'sms', label: '短信通知', desc: '订单/物流' },
            { key: 'likes', label: '点赞通知', desc: '你的内容被点赞' },
            { key: 'comments', label: '评论通知', desc: '你的内容被评论' },
            { key: 'follows', label: '关注通知', desc: '新增粉丝' },
            { key: 'live', label: '直播通知', desc: '关注的创作者开播' },
            { key: 'debatel', label: '辩论通知', desc: '辩论相关动态' },
            { key: 'marketing', label: '营销通知', desc: '活动/优惠' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-[10px] text-ink-500">{item.desc}</p>
              </div>
              <Toggle on={(settings.notif as any)[item.key]} onChange={() => toggle('notif', item.key)} />
            </div>
          ))}
        </div>
      )}

      {active === 'blacklist' && (
        <div className="space-y-2">
          <p className="text-xs text-ink-500 px-1">已拉黑 {blacklist.length} 人, 对方无法查看你的主页或联系你</p>
          {blacklist.length === 0 ? (
            <div className="text-center py-8 text-ink-500">
              <UserX className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">黑名单为空</p>
            </div>
          ) : (
            blacklist.map((u) => (
              <div key={u.id} className="bg-white/60 dark:bg-ink-900/30 rounded-xl p-2.5 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2">
                <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full grayscale" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{u.name}</p>
                  <p className="text-[10px] text-ink-500">拉黑于 {new Date(u.blockedAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => unblock(u.id)} className="px-2.5 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">解除</button>
              </div>
            ))
          )}
        </div>
      )}

      {active === 'data' && (
        <div className="space-y-2">
          <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
            <p className="text-sm font-bold flex items-center gap-1.5"><Lock className="w-4 h-4 text-slate-500" />数据管理</p>
            <ActionRow icon={Save} label="导出我的数据" desc="下载个人数据副本" onClick={() => toast('导出请求已提交, 24h 内发送至邮箱', 'success')} />
            <ActionRow icon={EyeOff} label="清除搜索历史" desc="清除所有搜索记录" onClick={() => toast('已清除', 'success')} />
            <ActionRow icon={EyeOff} label="清除浏览历史" desc="清除所有浏览足迹" onClick={() => toast('已清除', 'success')} />
            <ActionRow icon={Trash2} label="清除本地缓存" desc="释放存储空间" onClick={() => { localStorage.clear(); toast('已清除', 'success') }} />
          </div>
        </div>
      )}

      {active === 'delete' && (
        <div className="space-y-2">
          <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-3 border border-rose-200/40 space-y-2">
            <div className="flex items-center gap-1.5 text-rose-500">
              <AlertTriangle className="w-4 h-4" />
              <p className="text-sm font-bold">危险操作</p>
            </div>
            <p className="text-xs text-ink-500">注销账号后, 所有数据 (订单/内容/收藏) 将被永久删除, 无法恢复</p>
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full h-9 rounded-lg bg-rose-500 text-white text-sm font-semibold"
            >
              申请注销账号
            </button>
          </div>

          {confirmDelete && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-white dark:bg-ink-900 rounded-2xl p-5 space-y-3"
              >
                <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
                <h3 className="text-center text-lg font-bold">确认注销账号?</h3>
                <p className="text-center text-xs text-ink-500">此操作不可恢复, 请谨慎</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 h-9 rounded-lg border border-ink-200 dark:border-ink-800 text-sm">取消</button>
                  <button onClick={() => { toast('已提交申请, 7 天后生效', 'success'); setConfirmDelete(false) }} className="flex-1 h-9 rounded-lg bg-rose-500 text-white text-sm font-semibold">确认注销</button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn('w-10 h-6 rounded-full flex items-center transition px-0.5', on ? 'bg-nova-500 justify-end' : 'bg-ink-300 dark:bg-ink-700 justify-start')}
    >
      <div className="w-5 h-5 rounded-full bg-white shadow" />
    </button>
  )
}

function ActionRow({ icon: Icon, label, desc, onClick }: { icon: any; label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800 transition text-left">
      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[10px] text-ink-500">{desc}</p>
      </div>
      <Check className="w-3.5 h-3.5 text-ink-400" />
    </button>
  )
}
