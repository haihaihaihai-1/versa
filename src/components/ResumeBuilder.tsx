import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Camera, Sparkles, Loader2, Plus, Trash2, Edit3, Save, Download, Briefcase, GraduationCap, Award, Code, Heart, Globe, Star, User } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Experience { id: string; title: string; company: string; start: string; end: string; desc: string }
interface Education { id: string; school: string; degree: string; major: string; start: string; end: string }
interface Skill { id: string; name: string; level: number; category: string }
interface Project { id: string; name: string; desc: string; tech: string; link: string }

interface Resume {
  id: string
  name: string
  title: string
  template: 'modern' | 'classic' | 'minimal' | 'creative'
  personal: { name: string; title: string; email: string; phone: string; location: string; website: string; bio: string; avatar: string }
  experiences: Experience[]
  educations: Education[]
  skills: Skill[]
  projects: Project[]
  achievements: string[]
}

const STORAGE_KEY = 'versa:resume'

function load(): Resume {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return {
    id: 'r1',
    name: '我的简历',
    title: '高级前端工程师',
    template: 'modern',
    personal: { name: '张三', title: 'Senior Frontend Engineer', email: 'zhangsan@example.com', phone: '+86 138-0000-0000', location: '上海', website: 'github.com/zhangsan', bio: '8 年前端开发经验, 精通 React/Vue 生态, 关注性能优化和工程化。', avatar: 'https://i.pravatar.cc/200?img=12' },
    experiences: [
      { id: uid(), title: '高级前端工程师', company: '某科技公司', start: '2022-03', end: '至今', desc: '负责核心业务前端架构, 带领 5 人团队, 性能优化提升 40%' },
      { id: uid(), title: '前端工程师', company: '某互联网公司', start: '2018-06', end: '2022-02', desc: '开发多个核心产品, 维护 30+ 页面' },
    ],
    educations: [
      { id: uid(), school: '某大学', degree: '本科', major: '计算机科学', start: '2014-09', end: '2018-06' },
    ],
    skills: [
      { id: uid(), name: 'React', level: 5, category: '前端' },
      { id: uid(), name: 'TypeScript', level: 5, category: '前端' },
      { id: uid(), name: 'Node.js', level: 4, category: '后端' },
      { id: uid(), name: 'Figma', level: 3, category: '设计' },
    ],
    projects: [
      { id: uid(), name: 'Versa 平台', desc: '购物/社交/辩论三体融合 SPA', tech: 'React, TypeScript, Tailwind', link: 'https://versa.app' },
    ],
    achievements: ['2024 年度优秀员工', 'GitHub 100+ stars 开源项目作者'],
  }
}
function save(d: Resume) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const TEMPLATES: Record<Resume['template'], { label: string; color: string; emoji: string }> = {
  modern: { label: '现代', color: 'from-violet-500 to-purple-500', emoji: '✨' },
  classic: { label: '经典', color: 'from-slate-700 to-slate-900', emoji: '📄' },
  minimal: { label: '极简', color: 'from-ink-200 to-ink-400', emoji: '◽' },
  creative: { label: '创意', color: 'from-rose-500 to-pink-500', emoji: '🎨' },
}

export function ResumeBuilder() {
  const [resume, setResume] = useState<Resume>(load())
  const [aiLoading, setAiLoading] = useState(false)
  const [section, setSection] = useState<'personal' | 'experience' | 'education' | 'skills' | 'projects' | 'achievements'>('personal')

  useEffect(() => { save(resume) }, [resume])

  const updatePersonal = (patch: Partial<Resume['personal']>) => setResume({ ...resume, personal: { ...resume.personal, ...patch } })
  const updateExp = (id: string, patch: Partial<Experience>) => setResume({ ...resume, experiences: resume.experiences.map((e) => e.id === id ? { ...e, ...patch } : e) })
  const updateEdu = (id: string, patch: Partial<Education>) => setResume({ ...resume, educations: resume.educations.map((e) => e.id === id ? { ...e, ...patch } : e) })
  const updateSkill = (id: string, patch: Partial<Skill>) => setResume({ ...resume, skills: resume.skills.map((s) => s.id === id ? { ...s, ...patch } : s) })
  const updateProj = (id: string, patch: Partial<Project>) => setResume({ ...resume, projects: resume.projects.map((p) => p.id === id ? { ...p, ...patch } : p) })

  const addExp = () => setResume({ ...resume, experiences: [...resume.experiences, { id: uid(), title: '', company: '', start: '', end: '', desc: '' }] })
  const removeExp = (id: string) => setResume({ ...resume, experiences: resume.experiences.filter((e) => e.id !== id) })
  const addEdu = () => setResume({ ...resume, educations: [...resume.educations, { id: uid(), school: '', degree: '', major: '', start: '', end: '' }] })
  const removeEdu = (id: string) => setResume({ ...resume, educations: resume.educations.filter((e) => e.id !== id) })
  const addSkill = () => setResume({ ...resume, skills: [...resume.skills, { id: uid(), name: '新技能', level: 3, category: '通用' }] })
  const removeSkill = (id: string) => setResume({ ...resume, skills: resume.skills.filter((s) => s.id !== id) })
  const addProj = () => setResume({ ...resume, projects: [...resume.projects, { id: uid(), name: '', desc: '', tech: '', link: '' }] })
  const removeProj = (id: string) => setResume({ ...resume, projects: resume.projects.filter((p) => p.id !== id) })
  const addAchievement = () => setResume({ ...resume, achievements: [...resume.achievements, ''] })
  const removeAchievement = (i: number) => setResume({ ...resume, achievements: resume.achievements.filter((_, j) => j !== i) })

  const aiPolish = async (text: string): Promise<string> => {
    if (!isAIEnabled() || !text.trim()) return text
    try {
      return await aiComplete(`润色以下简历文本, 50-80 字, 简洁专业, 第一人称: ${text}`, '你是 Versa 简历顾问, 简洁专业, 中文')
    } catch { return text }
  }

  const aiPolishBio = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setAiLoading(true)
    try {
      const result = await aiComplete(`润色以下个人简介, 80-100 字, 突出专业能力和经验: ${resume.personal.bio}`, '你是 Versa 简历顾问, 简洁专业, 中文')
      updatePersonal({ bio: result })
      toast('已润色', 'success')
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setAiLoading(false) }
  }

  const aiImprove = async (id: string, current: string) => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setAiLoading(true)
    try {
      const result = await aiComplete(`润色以下工作经历, 50-80 字, 突出成就和数据: ${current}`, '你是 Versa 简历顾问, 简洁专业, 中文')
      updateExp(id, { desc: result })
      toast('已润色', 'success')
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setAiLoading(false) }
  }

  const TEMPLATE = TEMPLATES[resume.template]

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="w-5 h-5" />
          <h2 className="text-lg font-bold">简历生成</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">4 模板 · AI 润色</p>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map((k) => (
            <button key={k} onClick={() => setResume({ ...resume, template: k })} className={cn('h-9 rounded-lg flex flex-col items-center justify-center gap-0.5', resume.template === k ? `bg-gradient-to-r ${TEMPLATES[k].color} ring-2 ring-white` : 'bg-white/15')}>
              <span className="text-base">{TEMPLATES[k].emoji}</span>
              <span className="text-[9px] font-semibold">{TEMPLATES[k].label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {([
          { k: 'personal' as const, l: '基本信息' },
          { k: 'experience' as const, l: '经历' },
          { k: 'education' as const, l: '教育' },
          { k: 'skills' as const, l: '技能' },
          { k: 'projects' as const, l: '项目' },
          { k: 'achievements' as const, l: '成就' },
        ]).map((s) => (
          <button key={s.k} onClick={() => setSection(s.k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', section === s.k ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {s.l}
          </button>
        ))}
      </div>

      {section === 'personal' && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
          <div className="flex items-center gap-2">
            <img src={resume.personal.avatar} alt="" className="w-16 h-16 rounded-full object-cover" />
            <div className="flex-1">
              <input value={resume.personal.name} onChange={(e) => updatePersonal({ name: e.target.value })} placeholder="姓名" className="w-full px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-sm font-bold" />
              <input value={resume.personal.title} onChange={(e) => updatePersonal({ title: e.target.value })} placeholder="职位" className="w-full px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <input value={resume.personal.email} onChange={(e) => updatePersonal({ email: e.target.value })} placeholder="邮箱" className="px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
            <input value={resume.personal.phone} onChange={(e) => updatePersonal({ phone: e.target.value })} placeholder="电话" className="px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
            <input value={resume.personal.location} onChange={(e) => updatePersonal({ location: e.target.value })} placeholder="城市" className="px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
            <input value={resume.personal.website} onChange={(e) => updatePersonal({ website: e.target.value })} placeholder="网站/主页" className="px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
          </div>
          <div>
            <p className="text-xs font-bold mb-1">个人简介</p>
            <textarea value={resume.personal.bio} onChange={(e) => updatePersonal({ bio: e.target.value })} rows={4} className="w-full px-2 py-1.5 rounded bg-ink-50 dark:bg-ink-800 text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <button onClick={aiPolishBio} disabled={aiLoading} className="mt-1 w-full h-8 rounded bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 润色简介
            </button>
          </div>
        </div>
      )}

      {section === 'experience' && (
        <div className="space-y-1.5">
          {resume.experiences.map((e) => (
            <div key={e.id} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-ink-500">工作经历</p>
                <button onClick={() => removeExp(e.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
              </div>
              <input value={e.title} onChange={(ev) => updateExp(e.id, { title: ev.target.value })} placeholder="职位" className="w-full px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-sm font-bold" />
              <input value={e.company} onChange={(ev) => updateExp(e.id, { company: ev.target.value })} placeholder="公司" className="w-full px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
              <div className="grid grid-cols-2 gap-1.5">
                <input type="month" value={e.start} onChange={(ev) => updateExp(e.id, { start: ev.target.value })} className="px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
                <input type="month" value={e.end} onChange={(ev) => updateExp(e.id, { end: ev.target.value })} placeholder="至今" className="px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
              </div>
              <textarea value={e.desc} onChange={(ev) => updateExp(e.id, { desc: ev.target.value })} placeholder="描述" rows={3} className="w-full px-2 py-1.5 rounded bg-ink-50 dark:bg-ink-800 text-xs outline-none resize-none" />
              <button onClick={() => aiImprove(e.id, e.desc)} disabled={aiLoading} className="w-full h-7 rounded bg-blue-500 text-white text-[10px] font-semibold flex items-center justify-center gap-1">
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 润色
              </button>
            </div>
          ))}
          <button onClick={addExp} className="w-full h-9 rounded-lg bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
            <Plus className="w-3 h-3" />添加经历
          </button>
        </div>
      )}

      {section === 'education' && (
        <div className="space-y-1.5">
          {resume.educations.map((e) => (
            <div key={e.id} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-ink-500">教育</p>
                <button onClick={() => removeEdu(e.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
              </div>
              <input value={e.school} onChange={(ev) => updateEdu(e.id, { school: ev.target.value })} placeholder="学校" className="w-full px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-sm font-bold" />
              <div className="grid grid-cols-2 gap-1.5">
                <input value={e.degree} onChange={(ev) => updateEdu(e.id, { degree: ev.target.value })} placeholder="学历" className="px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
                <input value={e.major} onChange={(ev) => updateEdu(e.id, { major: ev.target.value })} placeholder="专业" className="px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input type="month" value={e.start} onChange={(ev) => updateEdu(e.id, { start: ev.target.value })} className="px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
                <input type="month" value={e.end} onChange={(ev) => updateEdu(e.id, { end: ev.target.value })} className="px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
              </div>
            </div>
          ))}
          <button onClick={addEdu} className="w-full h-9 rounded-lg bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
            <Plus className="w-3 h-3" />添加教育
          </button>
        </div>
      )}

      {section === 'skills' && (
        <div className="space-y-1.5">
          {resume.skills.map((s) => (
            <div key={s.id} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input value={s.name} onChange={(ev) => updateSkill(s.id, { name: ev.target.value })} placeholder="技能" className="flex-1 px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-sm" />
                <input value={s.category} onChange={(ev) => updateSkill(s.id, { category: ev.target.value })} placeholder="类别" className="w-20 px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
                <button onClick={() => removeSkill(s.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((l) => (
                  <button key={l} onClick={() => updateSkill(s.id, { level: l })} className={cn('flex-1 h-3 rounded', s.level >= l ? `bg-gradient-to-r ${TEMPLATE.color}` : 'bg-ink-100 dark:bg-ink-800')} />
                ))}
              </div>
            </div>
          ))}
          <button onClick={addSkill} className="w-full h-9 rounded-lg bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
            <Plus className="w-3 h-3" />添加技能
          </button>
        </div>
      )}

      {section === 'projects' && (
        <div className="space-y-1.5">
          {resume.projects.map((p) => (
            <div key={p.id} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <input value={p.name} onChange={(ev) => updateProj(p.id, { name: ev.target.value })} placeholder="项目名" className="flex-1 px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-sm font-bold" />
                <button onClick={() => removeProj(p.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <input value={p.tech} onChange={(ev) => updateProj(p.id, { tech: ev.target.value })} placeholder="技术栈" className="w-full px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
              <textarea value={p.desc} onChange={(ev) => updateProj(p.id, { desc: ev.target.value })} placeholder="描述" rows={2} className="w-full px-2 py-1.5 rounded bg-ink-50 dark:bg-ink-800 text-xs outline-none resize-none" />
              <input value={p.link} onChange={(ev) => updateProj(p.id, { link: ev.target.value })} placeholder="链接" className="w-full px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
            </div>
          ))}
          <button onClick={addProj} className="w-full h-9 rounded-lg bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
            <Plus className="w-3 h-3" />添加项目
          </button>
        </div>
      )}

      {section === 'achievements' && (
        <div className="space-y-1.5">
          {resume.achievements.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input value={a} onChange={(e) => { const next = [...resume.achievements]; next[i] = e.target.value; setResume({ ...resume, achievements: next }) }} placeholder="成就/奖项" className="flex-1 px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
              <button onClick={() => removeAchievement(i)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={addAchievement} className="w-full h-9 rounded-lg bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
            <Plus className="w-3 h-3" />添加成就
          </button>
        </div>
      )}

      <button onClick={() => window.print()} className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-1.5">
        <Download className="w-4 h-4" />打印/导出
      </button>
    </div>
  )
}
