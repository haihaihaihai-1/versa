import type { MemberPrivilege, SignInDay, TaskItem, RewardItem } from './types'

export const MEMBER_LEVELS: MemberPrivilege[] = [
  {
    level: 'normal',
    name: '普通会员',
    threshold: 0,
    icon: 'User',
    gradient: 'from-slate-400 to-zinc-500',
    benefits: ['基础下单', '基础客服', '每月 1 张通用券'],
    discount: 0,
    pointsRate: 1,
  },
  {
    level: 'silver',
    name: '银卡会员',
    threshold: 500,
    icon: 'Award',
    gradient: 'from-gray-300 to-slate-500',
    benefits: ['下单 9.5 折', '每月 3 张通用券', '生日双倍积分', '专属客服'],
    discount: 0.95,
    pointsRate: 1.2,
  },
  {
    level: 'gold',
    name: '金卡会员',
    threshold: 2000,
    icon: 'Crown',
    gradient: 'from-amber-400 to-yellow-600',
    benefits: ['下单 9 折', '每月 5 张通用券', '生日双倍积分', '免邮特权', '优先发货', '会员日 5 折'],
    discount: 0.9,
    pointsRate: 1.5,
  },
  {
    level: 'diamond',
    name: '钻石会员',
    threshold: 10000,
    icon: 'Gem',
    gradient: 'from-cyan-400 via-blue-500 to-violet-500',
    benefits: ['下单 8.5 折', '每月 10 张通用券', '生日 3 倍积分', '终身免邮', '专属管家', '新品试用', '线下活动'],
    discount: 0.85,
    pointsRate: 2,
  },
]

export const seedSignInDays: SignInDay[] = [
  { day: 1, points: 10, status: 'done', isToday: false, isReward: false },
  { day: 2, points: 20, status: 'done', isToday: false, isReward: false },
  { day: 3, points: 30, status: 'done', isToday: false, isReward: false },
  { day: 4, points: 50, status: 'today', isToday: true, isReward: true },
  { day: 5, points: 60, status: 'future', isToday: false, isReward: false },
  { day: 6, points: 80, status: 'future', isToday: false, isReward: false },
  { day: 7, points: 200, status: 'future', isToday: false, isReward: true },
]

export const seedTasks: TaskItem[] = [
  { id: 't_d1', name: '每日签到', desc: '连续签到 7 天奖励 200 积分', type: 'daily', icon: 'Calendar', gradient: 'from-rose-400 to-pink-500', target: 1, progress: 0, points: 10, completed: false, claimed: false },
  { id: 't_d2', name: '浏览商品', desc: '浏览 5 个商品', type: 'daily', icon: 'Eye', gradient: 'from-blue-400 to-cyan-500', target: 5, progress: 3, points: 20, completed: false, claimed: false },
  { id: 't_d3', name: '分享好友', desc: '分享 1 个商品给好友', type: 'daily', icon: 'Share2', gradient: 'from-emerald-400 to-teal-500', target: 1, progress: 0, points: 30, completed: false, claimed: false },
  { id: 't_d4', name: '评价订单', desc: '评价 1 笔已完成的订单', type: 'daily', icon: 'Star', gradient: 'from-amber-400 to-orange-500', target: 1, progress: 0, points: 50, completed: false, claimed: false },
  { id: 't_a1', name: '新手首单', desc: '完成第 1 笔订单', type: 'achieve', icon: 'ShoppingBag', gradient: 'from-violet-400 to-purple-500', target: 1, progress: 0, points: 200, completed: false, claimed: false },
  { id: 't_a2', name: '累计消费 ¥500', desc: '消费满 500 升级银卡', type: 'achieve', icon: 'TrendingUp', gradient: 'from-fuchsia-400 to-pink-500', target: 500, progress: 280, points: 500, completed: false, claimed: false },
  { id: 't_a3', name: '邀请好友', desc: '邀请 3 位好友注册', type: 'achieve', icon: 'UserPlus', gradient: 'from-cyan-400 to-blue-500', target: 3, progress: 1, points: 300, completed: false, claimed: false },
]

export const seedRewards: RewardItem[] = [
  { id: 'r_1', name: '¥10 通用券', desc: '满 50 可用 · 7 天有效', type: 'coupon', cost: 500, stock: 999, cover: '', coverGradient: 'from-rose-400 to-pink-500', badge: 'HOT' },
  { id: 'r_2', name: '¥50 数码券', desc: '满 500 可用 · 30 天有效', type: 'coupon', cost: 2000, stock: 500, cover: '', coverGradient: 'from-blue-400 to-cyan-500' },
  { id: 'r_3', name: '蓝牙耳机', desc: 'Versa Pro X · 限量 200 份', type: 'product', cost: 8800, stock: 200, cover: '', coverGradient: 'from-violet-400 to-purple-500', badge: '限量' },
  { id: 'r_4', name: '会员月卡', desc: '银卡特权 · 30 天', type: 'privilege', cost: 1500, stock: 999, cover: '', coverGradient: 'from-gray-300 to-slate-500' },
  { id: 'r_5', name: '免费包邮券 ×5', desc: '5 张 · 30 天有效', type: 'coupon', cost: 800, stock: 999, cover: '', coverGradient: 'from-emerald-400 to-teal-500' },
  { id: 'r_6', name: '智能音箱', desc: 'Versa Mini · 限量 100 份', type: 'product', cost: 15800, stock: 100, cover: '', coverGradient: 'from-amber-400 to-orange-500', badge: '新品' },
  { id: 'r_7', name: '生日礼盒', desc: 'Versa 限定礼盒 · 全年可用', type: 'gift', cost: 3000, stock: 365, cover: '', coverGradient: 'from-pink-400 to-rose-500' },
  { id: 'r_8', name: '专属客服月卡', desc: '一对一专属管家 · 30 天', type: 'privilege', cost: 1200, stock: 999, cover: '', coverGradient: 'from-cyan-400 to-blue-500', badge: 'VIP' },
  { id: 'r_9', name: '¥100 通用券', desc: '满 800 可用 · 7 天有效', type: 'coupon', cost: 4000, stock: 200, cover: '', coverGradient: 'from-amber-500 to-red-500' },
  { id: 'r_10', name: '机械键盘', desc: 'Versa K3 · 限量 50 份', type: 'product', cost: 22800, stock: 50, cover: '', coverGradient: 'from-slate-500 to-zinc-700', badge: '稀缺' },
]
