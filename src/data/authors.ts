import type { Author } from './types'

export const authors: Record<string, Author> = {
  lin: {
    id: 'u_lin',
    name: '林未央',
    handle: '@linweiyang',
    avatar: 'https://i.pravatar.cc/120?img=47',
    bio: '科技专栏作者 · 关注 AI 与人类工作。斯坦福 AI Lab 客座研究员，前《财新》科技主笔。',
    verified: true,
    followers: 24820,
  },
  zhao: {
    id: 'u_zhao',
    name: '赵明远',
    handle: '@zhaomingyuan',
    avatar: 'https://i.pravatar.cc/120?img=12',
    bio: '财经评论员 · 资本市场观察者。前券商首席宏观分析师，CFA。',
    verified: true,
    followers: 18930,
  },
  shen: {
    id: 'u_shen',
    name: '沈听雨',
    handle: '@shentinyu',
    avatar: 'https://i.pravatar.cc/120?img=23',
    bio: '文化记者 · 城市与生活方式',
    followers: 12480,
  },
  qian: {
    id: 'u_qian',
    name: '钱思源',
    handle: '@qiansiyuan',
    avatar: 'https://i.pravatar.cc/120?img=33',
    bio: '科学作者 · 探索宇宙与生命。中科院国家天文台客座研究员。',
    verified: true,
    followers: 31560,
  },
  he: {
    id: 'u_he',
    name: '何川',
    handle: '@hechuan',
    avatar: 'https://i.pravatar.cc/120?img=15',
    bio: '国际新闻 · 驻东南亚 5 年，前《财新》国际部资深记者。',
    followers: 15230,
  },
  fang: {
    id: 'u_fang',
    name: '方一然',
    handle: '@fangyiran',
    avatar: 'https://i.pravatar.cc/120?img=49',
    bio: '消费观察 · 品牌与设计。《第一财经》特约撰稿人，著有《消费即叙事》。',
    followers: 8940,
  },
  wu: {
    id: 'u_wu',
    name: '吴明珏',
    handle: '@wumingjue',
    avatar: 'https://i.pravatar.cc/120?img=58',
    bio: '独立辩论主持人',
    verified: true,
  },
}

export const userAvatars: string[] = [
  'https://i.pravatar.cc/120?img=68',
  'https://i.pravatar.cc/120?img=64',
  'https://i.pravatar.cc/120?img=52',
  'https://i.pravatar.cc/120?img=37',
  'https://i.pravatar.cc/120?img=24',
  'https://i.pravatar.cc/120?img=9',
  'https://i.pravatar.cc/120?img=14',
  'https://i.pravatar.cc/120?img=19',
]

export const userNames: string[] = [
  '墨白', '青衫客', '晚风', '鹿鸣', '浮光', '南风', '清和', '星河', '远山', '云间月',
  '莫问', '听雪', '折光', '白夜', '余晖', '回声', '拾光', '南山', '望舒', '谷雨',
]
