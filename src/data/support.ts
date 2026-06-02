import type { FAQ, SupportTicket, ChatMessage } from './types'

export const FAQ_CATEGORIES: { key: FAQ['category']; label: string; icon: string; gradient: string }[] = [
  { key: 'order', label: '订单相关', icon: 'Package', gradient: 'from-blue-500 to-cyan-500' },
  { key: 'shipping', label: '物流配送', icon: 'Truck', gradient: 'from-emerald-500 to-teal-500' },
  { key: 'payment', label: '支付问题', icon: 'CreditCard', gradient: 'from-amber-500 to-orange-500' },
  { key: 'refund', label: '退款售后', icon: 'RotateCcw', gradient: 'from-rose-500 to-pink-500' },
  { key: 'member', label: '会员中心', icon: 'Crown', gradient: 'from-violet-500 to-purple-500' },
  { key: 'coupon', label: '优惠券', icon: 'Ticket', gradient: 'from-red-500 to-rose-500' },
  { key: 'account', label: '账号安全', icon: 'Shield', gradient: 'from-slate-500 to-zinc-600' },
  { key: 'product', label: '商品咨询', icon: 'ShoppingBag', gradient: 'from-fuchsia-500 to-pink-500' },
]

export const seedFAQs: FAQ[] = [
  // 订单
  { id: 'faq_o1', category: 'order', question: '如何查看我的订单状态？', answer: '您可以在「我的 → 订单」中查看所有订单状态。订单分为待付款、待发货、待收货、待评价、已完成等多种状态。', helpful: 1284 },
  { id: 'faq_o2', category: 'order', question: '订单提交后可以修改地址吗？', answer: '订单在「待发货」状态下可以修改收货地址。点击订单详情页右上角的「修改地址」按钮即可。但发货后无法修改。', helpful: 856 },
  { id: 'faq_o3', category: 'order', question: '为什么订单被取消了？', answer: '订单可能被取消的原因：1）超过支付时效未付款；2）库存不足；3）风控系统检测到异常。如有疑问可联系客服。', helpful: 423 },
  { id: 'faq_o4', category: 'order', question: '怎么合并多个订单一起发货？', answer: '由于订单独立打包发货，暂不支持合并。如有特殊情况，可联系人工客服处理。', helpful: 234 },

  // 物流
  { id: 'faq_s1', category: 'shipping', question: '什么时候发货？', answer: '现货商品 24 小时内发货，预售商品以详情页标注的发货时间为准。节假日可能延迟 1-2 天。', helpful: 2340 },
  { id: 'faq_s2', category: 'shipping', question: '快递到哪了？', answer: '在「订单详情」中可实时查看物流轨迹。也可复制快递单号到快递公司官网或菜鸟裹裹查询。', helpful: 1890 },
  { id: 'faq_s3', category: 'shipping', question: '可以指定快递公司吗？', answer: '部分商品支持指定快递（顺丰/京东/EMS），下单时可在备注中说明。', helpful: 567 },
  { id: 'faq_s4', category: 'shipping', question: '海外/港澳台可以配送吗？', answer: '目前支持部分国家配送，具体以下单页面提示为准。港澳台地区满 ¥299 免运费。', helpful: 234 },

  // 支付
  { id: 'faq_p1', category: 'payment', question: '支持哪些支付方式？', answer: '支持微信、支付宝、花呗、京东支付、银行卡、云闪付、指纹支付 7 种方式。', helpful: 3450 },
  { id: 'faq_p2', category: 'payment', question: '为什么支付失败？', answer: '常见原因：1）余额不足；2）支付环境异常；3）银行限额；4）风控拦截。建议更换支付方式或联系发卡行。', helpful: 1567 },
  { id: 'faq_p3', category: 'payment', question: '可以用礼品卡支付吗？', answer: '可以。结算时选择「余额支付」即可使用账户余额、礼品卡、积分抵扣组合付款。', helpful: 423 },

  // 退款
  { id: 'faq_r1', category: 'refund', question: '如何申请退款？', answer: '在订单详情页点击「申请售后」，选择退款类型（仅退款/退货退款/换货）即可。审核通常 1-2 个工作日。', helpful: 2890 },
  { id: 'faq_r2', category: 'refund', question: '退款多久到账？', answer: '原路退回：微信/支付宝 1-3 个工作日，银行卡 3-7 个工作日。余额实时到账。', helpful: 1890 },
  { id: 'faq_r3', category: 'refund', question: '已拆封商品能退吗？', answer: '不影响二次销售的情况下支持 7 天无理由。已拆封但未损坏的商品，部分类目（如美妆、食品）不支持。', helpful: 678 },
  { id: 'faq_r4', category: 'refund', question: '运费谁出？', answer: '7 天无理由退货由买家承担运费；商品质量问题运费由商家承担，可在退款时申请运费险理赔。', helpful: 890 },

  // 会员
  { id: 'faq_m1', category: 'member', question: '如何升级会员等级？', answer: '累计消费金额决定会员等级：普通(0)、银卡(¥500)、金卡(¥2000)、钻石(¥10000)。', helpful: 1234 },
  { id: 'faq_m2', category: 'member', question: '会员有什么特权？', answer: '金卡及以上会员享受：专属客服、优先发货、积分加倍、生日礼券、免运费特权。', helpful: 987 },
  { id: 'faq_m3', category: 'member', question: '积分怎么用？', answer: '100 积分 = 1 元，下单时勾选「使用积分」即可抵扣，最多抵扣订单金额的 30%。', helpful: 1567 },

  // 优惠券
  { id: 'faq_c1', category: 'coupon', question: '领的券在哪里查看？', answer: '在「我的 → 优惠券」中可以查看所有已领取的优惠券，包括状态、有效期、适用范围。', helpful: 2345 },
  { id: 'faq_c2', category: 'coupon', question: '为什么券用不了？', answer: '请检查：1）是否满足满减门槛；2）是否在有效期内；3）适用范围（品类/店铺）；4）是否已使用过。', helpful: 1456 },
  { id: 'faq_c3', category: 'coupon', question: '券可以转赠吗？', answer: '部分平台券支持转赠好友，具体以券详情页说明为准。大部分品牌券仅限本人使用。', helpful: 567 },

  // 账号
  { id: 'faq_a1', category: 'account', question: '忘记密码怎么办？', answer: '登录页点击「忘记密码」，通过注册手机号或邮箱接收验证码，重置密码即可。', helpful: 1890 },
  { id: 'faq_a2', category: 'account', question: '怎么修改手机号？', answer: '在「我的 → 设置 → 账号安全」中修改，需要原手机号验证码 + 新手机号验证码双重验证。', helpful: 678 },
  { id: 'faq_a3', category: 'account', question: '账号被盗了怎么办？', answer: '请立即联系人工客服冻结账号，并提供注册信息、最近订单等证明材料申诉。', helpful: 345 },

  // 商品
  { id: 'faq_pr1', category: 'product', question: '商品是正品吗？', answer: 'Versa 平台所有商品均经过严格审核，假一赔十。品牌旗舰店的商品由品牌方直接供货。', helpful: 3456 },
  { id: 'faq_pr2', category: 'product', question: '商品支持以旧换新吗？', answer: '数码、家电类目部分商品支持以旧换新。详情页有「以旧换新」标签的商品可参与。', helpful: 567 },
  { id: 'faq_pr3', category: 'product', question: '怎么联系卖家？', answer: '在商品详情页点击「客服」即可联系品牌官方客服。售前售后问题都能解答。', helpful: 234 },
]

// 智能助手预设回复
export const BOT_INTENTS: { intent: string; patterns: string[]; reply: string }[] = [
  { intent: 'order_query', patterns: ['查订单', '我的订单', '订单状态'], reply: '您可以在「我的 → 订单」中查看所有订单。要我帮您跳转到订单页面吗？' },
  { intent: 'shipping', patterns: ['快递', '物流', '到哪了', '多久到'], reply: '请提供您的订单号或快递单号，我可以帮您查询具体物流信息。' },
  { intent: 'refund', patterns: ['退款', '退货', '退钱', '退一下'], reply: '请告诉我订单号和问题原因，我帮您申请售后。7 天无理由 + 商品质量问题都能处理。' },
  { intent: 'coupon', patterns: ['优惠券', '怎么用券', '券用不了'], reply: '您的优惠券在「我的 → 优惠券」中查看，下单时自动匹配可用券。常见问题：满减门槛、有效期、适用范围。' },
  { intent: 'member', patterns: ['会员', '升级', '积分'], reply: '当前您是 💎 金卡会员，剩余 1280 积分。100 积分 = 1 元，可用于订单抵扣。' },
  { intent: 'price', patterns: ['便宜', '降价', '折扣'], reply: '您可以关注「短视频种草」和「领券中心」，每日都有特价好物和限量秒杀。' },
  { intent: 'greet', patterns: ['你好', 'hi', '在吗', '客服'], reply: '您好！我是 Versa 智能助手小 V 🤖，有什么可以帮您？您可以试试问我：订单 / 物流 / 退款 / 优惠券 / 会员' },
  { intent: 'thanks', patterns: ['谢谢', '感谢', 'thx'], reply: '不客气～如果还有问题随时找我！祝您购物愉快 🌸' },
]

export const seedTickets: SupportTicket[] = [
  {
    id: 't_001',
    title: '订单 #20260528 未收到货',
    status: 'open',
    category: 'shipping',
    lastMessage: '客服小王：您好，您的反馈已记录，我们会在 24 小时内联系快递公司核实',
    messages: [
      { id: 'tm1', role: 'user', content: '我的订单 5 月 25 号发货的，到今天还没收到', at: '2026-05-30T10:30:00Z' },
      { id: 'tm2', role: 'agent', content: '您好，我是客服小王，请问您的订单号是？', at: '2026-05-30T10:35:00Z' },
      { id: 'tm3', role: 'user', content: '#20260528', at: '2026-05-30T10:36:00Z' },
      { id: 'tm4', role: 'agent', content: '您好，您的反馈已记录，我们会在 24 小时内联系快递公司核实', at: '2026-05-30T10:40:00Z' },
    ],
    createdAt: '2026-05-30T10:30:00Z',
    updatedAt: '2026-05-30T10:40:00Z',
  },
  {
    id: 't_002',
    title: '退款进度咨询',
    status: 'resolved',
    category: 'refund',
    lastMessage: '客服小李：退款已原路返回，微信预计 1-3 个工作日到账',
    messages: [
      { id: 'tm5', role: 'user', content: '我上周申请的退款怎么还没到？', at: '2026-05-25T14:20:00Z' },
      { id: 'tm6', role: 'agent', content: '客服小李：退款已原路返回，微信预计 1-3 个工作日到账', at: '2026-05-25T14:25:00Z' },
    ],
    createdAt: '2026-05-25T14:20:00Z',
    updatedAt: '2026-05-25T14:25:00Z',
  },
]

export const seedChatMessages: ChatMessage[] = [
  { id: 'cm1', role: 'bot', content: '您好！我是 Versa 智能助手小 V 🤖\n有什么可以帮您？', at: new Date(Date.now() - 60000).toISOString() },
]
