import type { AppMessage } from './types'

export const seedMessages: AppMessage[] = [
  // 物流
  { id: 'm1', category: 'shipping', type: 'order_shipped', title: '订单已发货', preview: '您的订单 #20260528 已由顺丰发出，预计明日送达', content: '您的订单已由顺丰快递发出，快递单号：SF1234567890，预计明日 14:00 前送达。请保持手机畅通～', icon: 'Truck', gradient: 'from-emerald-400 to-teal-500', unread: true, pinned: true, link: '/orders/o_001', meta: { orderId: 'o_001' }, at: '2026-05-30T10:30:00Z' },
  { id: 'm2', category: 'shipping', type: 'order_delivered', title: '订单已签收', preview: '订单 #20260520 已签收，感谢您的支持', content: '您的订单 #20260520 已签收，期待您的好评～', icon: 'Package', gradient: 'from-blue-400 to-cyan-500', unread: true, pinned: false, link: '/orders/o_002', meta: { orderId: 'o_002' }, at: '2026-05-28T16:20:00Z' },
  { id: 'm3', category: 'shipping', type: 'order_paid', title: '支付成功', preview: '订单 #20260527 支付成功 ¥890', content: '您的订单已支付成功，金额 ¥890，预计 24 小时内发货。', icon: 'CheckCircle2', gradient: 'from-violet-400 to-purple-500', unread: false, pinned: false, meta: { orderId: 'o_003', amount: 890 }, at: '2026-05-27T14:32:00Z' },

  // 优惠
  { id: 'm4', category: 'promo', type: 'coupon_received', title: '已领取 5 张优惠券', preview: '618 大促开门红 · 5 张通用券已到账', content: '您已成功领取 5 张优惠券：\n• ¥10 通用券 × 2\n• ¥50 数码券 × 1\n• ¥100 通用券 × 1\n• 满减券 × 1\n有效期 7 天，请尽快使用。', icon: 'Ticket', gradient: 'from-rose-400 to-pink-500', unread: true, pinned: true, link: '/shop/coupons', at: '2026-05-30T09:00:00Z' },
  { id: 'm5', category: 'promo', type: 'flash_sale', title: '⚡ 限时秒杀', preview: '数码 Pro 耳机 ¥999 → ¥499 · 仅剩 2 小时', content: 'Pro 降噪耳机限时半价秒杀！原价 ¥999，活动价 ¥499。库存有限，先到先得。', icon: 'Zap', gradient: 'from-amber-400 to-red-500', unread: true, pinned: false, link: '/shop/p_001', at: '2026-05-30T08:00:00Z' },
  { id: 'm6', category: 'promo', type: 'price_drop', title: '收藏商品降价', preview: '您收藏的「机械键盘」降价了 ¥200', content: '您收藏的「机械键盘 Versa K3」从 ¥1299 降至 ¥1099，降价 ¥200。', icon: 'TrendingDown', gradient: 'from-red-400 to-rose-500', unread: false, pinned: false, at: '2026-05-29T12:00:00Z' },
  { id: 'm7', category: 'promo', type: 'member_upgrade', title: '🎉 恭喜升级金卡', preview: '您已升级为金卡会员，享受 9 折特权', content: '恭喜您升级为金卡会员！您将享受：\n• 下单 9 折优惠\n• 每月 5 张通用券\n• 生日双倍积分\n• 免邮特权', icon: 'Crown', gradient: 'from-yellow-400 to-amber-500', unread: false, pinned: false, at: '2026-05-25T20:00:00Z' },

  // 互动
  { id: 'm8', category: 'interact', type: 'comment_reply', title: '@Lila 回复了你', preview: '「永嘉路的私房菜真的绝绝子～」', content: '@用户 感谢支持～地址在永嘉路 332 号 弄堂里，看到红色招牌左拐就是啦！', icon: 'MessageCircle', gradient: 'from-cyan-400 to-blue-500', unread: true, pinned: false, link: '/shop/shorts/sv_001', at: '2026-05-30T07:30:00Z' },
  { id: 'm9', category: 'interact', type: 'follow_post', title: '@Momo酱 更新了', preview: '新视频「奶油色 OOTD 第 2 弹」', content: '您关注的创作者 @Momo酱 发布了新视频「奶油色 OOTD 第 2 弹」，快去围观～', icon: 'Heart', gradient: 'from-pink-400 to-rose-500', unread: true, pinned: false, link: '/shop/shorts/sv_002', meta: { creatorId: 'u_creator_momo' }, at: '2026-05-29T18:00:00Z' },
  { id: 'm10', category: 'interact', type: 'live_start', title: '🔴 直播开始', preview: '@数码Sam 正在开箱测评 AirPods Pro 3', content: '您关注的 @数码Sam 正在直播，主题「AirPods Pro 3 vs 国产旗舰」', icon: 'Video', gradient: 'from-red-500 to-pink-600', unread: false, pinned: false, link: '/shop/live', meta: { creatorId: 'u_creator_tech' }, at: '2026-05-29T20:00:00Z' },

  // 系统
  { id: 'm11', category: 'system', type: 'system_announce', title: '618 活动开启', preview: 'Versa 618 大促 · 5 月 30 日 - 6 月 18 日', content: 'Versa 618 大促正式启动！每日 0 点抢限量神券，直播间下单额外 9 折。', icon: 'Megaphone', gradient: 'from-violet-500 to-fuchsia-500', unread: true, pinned: true, at: '2026-05-30T00:00:00Z' },
  { id: 'm12', category: 'system', type: 'security_alert', title: '账号安全提醒', preview: '您的账号在新设备登录', content: '您的账号于 2026-05-29 22:30 在 iPhone (上海) 登录。如非本人操作请立即修改密码。', icon: 'Shield', gradient: 'from-slate-500 to-zinc-700', unread: false, pinned: false, at: '2026-05-29T22:30:00Z' },
  { id: 'm13', category: 'system', type: 'task_reward', title: '任务奖励到账', preview: '「评价订单」任务完成 +50 积分', content: '恭喜您完成任务「评价订单」！50 积分已到账。', icon: 'Trophy', gradient: 'from-amber-400 to-orange-500', unread: false, pinned: false, link: '/help/member', at: '2026-05-28T15:00:00Z' },
]
