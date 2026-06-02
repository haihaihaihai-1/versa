// ============== 设置页 ==============

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Save, Camera, Shield, Bell, Lock, Eye, Trash2, Sun, Moon, Monitor, Globe, Zap, LogOut, MessageCircle, Phone, AtSign, Heart, Download, Upload, Compass, Volume2 } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import api from '../api'
import { UserAvatar } from '../components/social/UserAvatar'
import { roleLabel, roleColor, ROLE_DESCRIPTIONS } from '../api/permissions'
import { versa, useVersa } from '../store/versa'
import { ThemeToggle } from '../hooks/useTheme'
import { cn } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

export function SettingsPage() {
  const navigate = useNavigate()
  const { user: me, updateMe, signOut } = useAuth()
  const [form, setForm] = useState({
    displayName: me?.displayName || '',
    bio: me?.bio || '',
    avatar: me?.avatar || '',
    cover: me?.cover || '',
    profilePublic: me?.privacy.profilePublic ?? true,
    showActivity: me?.privacy.showActivity ?? true,
    allowMessages: (me?.privacy.allowMessages || 'everyone') as 'everyone' | 'followers' | 'none',
  })
  const [saved, setSaved] = useState(false)
  const prefs = useVersa()

  if (!me) return <div className="p-12 text-center">请先<Link to="/auth" className="text-nova-600">登录</Link></div>

  const save = async () => {
    await updateMe({
      displayName: form.displayName,
      bio: form.bio,
      avatar: form.avatar,
      cover: form.cover,
      privacy: {
        profilePublic: form.profilePublic,
        showActivity: form.showActivity,
        allowMessages: form.allowMessages as any,
      },
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">账号设置</h1>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-emerald-600">已保存</span>}
          <button onClick={save} className="px-4 py-2 rounded-full bg-nova-500 text-white text-sm font-medium flex items-center gap-1.5 hover:bg-nova-600">
            <Save className="w-4 h-4" /> 保存
          </button>
        </div>
      </div>

      {/* Role info */}
      <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> 当前身份</h2>
        <div className="flex items-center gap-4">
          <UserAvatar user={me} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{me.displayName}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleColor(me.role))}>
                {roleLabel(me.role)}
              </span>
            </div>
            <p className="text-sm text-ink-500 mt-1">{ROLE_DESCRIPTIONS[me.role]}</p>
          </div>
        </div>
      </div>

      {/* Profile basics */}
      <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-5">
        <h2 className="font-semibold mb-4">基本资料</h2>
        <div className="space-y-4">
          <Field label="头像 URL">
            <div className="flex gap-2">
              <input
                value={form.avatar}
                onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900"
                placeholder="https://..."
              />
              {form.avatar && <img src={form.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />}
            </div>
          </Field>
          <Field label="封面图 URL">
            <input
              value={form.cover}
              onChange={(e) => setForm({ ...form, cover: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900"
              placeholder="https://..."
            />
          </Field>
          <Field label="昵称">
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900"
            />
          </Field>
          <Field label="个人简介">
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              maxLength={200}
              className="w-full px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900"
              placeholder="用 200 字以内介绍你自己..."
            />
            <div className="text-right text-xs text-ink-400 mt-1">{form.bio.length} / 200</div>
          </Field>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Zap className="w-4 h-4" /> 偏好设置</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">主题外观</div>
              <div className="text-xs text-ink-500 mt-0.5">浅色 / 深色 / 跟随系统</div>
            </div>
            <ThemeToggle />
          </div>
          <div>
            <div className="text-sm font-medium mb-2">语言</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: 'zh' as const, label: '简体中文' },
                { v: 'en' as const, label: 'English' },
              ]).map((o) => (
                <button
                  key={o.v}
                  onClick={() => versa.setLanguage(o.v)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium border',
                    prefs.preferences.language === o.v
                      ? 'border-nova-500 bg-nova-50 dark:bg-nova-900/30 text-nova-600'
                      : 'border-ink-200 dark:border-ink-800'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <Toggle
            label="减少动效"
            description="降低页面切换动画 (省电 / 提升性能)"
            checked={prefs.preferences.reducedMotion}
            onChange={(v) => versa.setReducedMotion(v)}
          />
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Lock className="w-4 h-4" /> 隐私</h2>
        <div className="space-y-3">
          <Toggle
            label="公开个人主页"
            description="允许未登录用户查看你的主页"
            checked={form.profilePublic}
            onChange={(v) => setForm({ ...form, profilePublic: v })}
          />
          <Toggle
            label="显示活跃状态"
            description="显示你的最近在线时间"
            checked={form.showActivity}
            onChange={(v) => setForm({ ...form, showActivity: v })}
          />
          <div>
            <div className="text-sm font-medium mb-2">谁能给我发私信</div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'everyone' as const, label: '所有人' },
                { v: 'followers' as const, label: '关注者' },
                { v: 'none' as const, label: '关闭' },
              ]).map((o) => (
                <button
                  key={o.v}
                  onClick={() => setForm({ ...form, allowMessages: o.v })}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium border',
                    form.allowMessages === o.v
                      ? 'border-nova-500 bg-nova-50 dark:bg-nova-900/30 text-nova-600'
                      : 'border-ink-200 dark:border-ink-800'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white dark:bg-ink-900 border border-debate-200 dark:border-debate-800 rounded-2xl p-5">
        <h2 className="font-semibold mb-4 text-debate-600">危险操作</h2>
        <div className="space-y-3">
          <button
            onClick={async () => { if (confirm('确定要退出登录吗？')) { await signOut(); navigate('/auth') } }}
            className="w-full px-4 py-2 rounded-lg border border-ink-200 dark:border-ink-800 hover:bg-ink-50 dark:hover:bg-ink-800 text-sm font-medium text-left"
          >
            退出登录
          </button>
          <button
            onClick={() => { if (confirm('重置所有数据？此操作不可恢复！')) { api.debug.reset(); window.location.reload() } }}
            className="w-full px-4 py-2 rounded-lg border border-debate-300 hover:bg-debate-50 text-sm font-medium text-left text-debate-600 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> 重置全部数据
          </button>
          <button
            onClick={() => {
              const data = localStorage.getItem('versa:store') || '{}'
              const blob = new Blob([data], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `versa-data-${new Date().toISOString().slice(0, 10)}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="w-full px-4 py-2 rounded-lg border border-nova-300 hover:bg-nova-50 text-sm font-medium text-left text-nova-600 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> 导出我的数据 (JSON)
          </button>
          <label className="w-full px-4 py-2 rounded-lg border border-ink-200 hover:bg-ink-50 text-sm font-medium text-left text-ink-700 flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" /> 导入数据 (JSON)
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const text = await f.text()
                try {
                  JSON.parse(text)
                  if (confirm('确认导入？这将覆盖当前数据。')) {
                    localStorage.setItem('versa:store', text)
                    window.location.reload()
                  }
                } catch {
                  alert('JSON 格式错误')
                }
              }}
            />
          </label>
          <button
            onClick={() => {
              try { localStorage.removeItem('versa:tour:completed') } catch {}
              window.location.reload()
            }}
            className="w-full px-4 py-2 rounded-lg border border-ink-200 hover:bg-ink-50 text-sm font-medium text-left text-ink-700 flex items-center gap-2"
          >
            <Compass className="w-4 h-4" /> 重新查看引导
          </button>
          <button
            onClick={() => {
              const enabled = localStorage.getItem('versa:sound-enabled') === 'true'
              if (enabled) {
                localStorage.setItem('versa:sound-enabled', 'false')
                toast('已关闭音效', 'info')
              } else {
                localStorage.setItem('versa:sound-enabled', 'true')
                toast('已开启音效', 'success')
              }
              window.location.reload()
            }}
            className="w-full px-4 py-2 rounded-lg border border-ink-200 hover:bg-ink-50 text-sm font-medium text-left text-ink-700 flex items-center gap-2"
          >
            <Volume2 className="w-4 h-4" /> 切换音效提示
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-ink-700 dark:text-ink-300 block mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-ink-500 mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-nova-500' : 'bg-ink-300 dark:bg-ink-700'
        )}
      >
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </div>
  )
}
