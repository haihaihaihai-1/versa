import type { NewsArticle } from './types'
import { authors } from './authors'

export const news: NewsArticle[] = [
  {
    id: 'n1',
    title: '生成式 AI 进入"协作时代"：当模型开始学会提问',
    subtitle: '从被动回答到主动引导，AI 的角色正在发生根本性转变。Versa 邀请三位研究者探讨这一趋势的深远影响。',
    cover: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80&auto=format&fit=crop',
    category: 'tech',
    author: authors.lin,
    publishedAt: '2026-05-28T09:30:00Z',
    readTime: 8,
    tags: ['AI', '大模型', '协作', '未来工作'],
    reactions: { like: 1248, insightful: 532, disagree: 89 },
    views: 28430,
    linkedDebateId: 'd1',
    linkedProductIds: ['p1', 'p4'],
    source: 'Versa 科技前沿',
    content: `过去的两年里，生成式 AI 给人的印象大多是"它能回答你的任何问题"。但如果你最近用过新一代的对话模型，你会发现一个微妙的变化：它们开始反问。

"当你向 AI 描述一个模糊的问题时，优秀的 AI 不会立即给答案，而是会问：你说的 X 具体是什么意思？你的最终目标是什么？"斯坦福 HAI 研究员林韵秋在采访中说。

## 协作的三个层次

我们将"AI 协作"大致划分为三个层次：

1. **被动响应**：用户提问，AI 回答。这是当前 90% 产品的状态。
2. **主动澄清**：AI 识别模糊点，反向提问以澄清需求。
3. **共创引导**：AI 与人类共同构造问题，在过程中激发新的思路。

真正的突破发生在第三层。最近的一项内部研究显示，使用"共创引导"模式的团队，决策质量比对照组高出 27%。

## 商业化拐点

"对企业来说，关键是 AI 不再是工具，而成为同事。"Versa 产品副总裁陈思齐分享了他们的内部实践：当 AI 拥有跨部门的上下文记忆后，它开始能跨任务地"推动"工作。

这背后是 RAG、长上下文窗口、记忆机制等多项技术的合流。

## 风险与边界

但协作也意味着 AI 有了更多"主动权"。如何在主动引导与不越界之间取得平衡，是接下来几年最值得关注的伦理议题。

我们邀请你参与本次报道延伸的辩论：**AI 应该主动向用户提问吗？**`,
  },
  {
    id: 'n2',
    title: '消费降级真的来了吗？我们分析了 12 万条订单数据',
    subtitle: '拼多多崛起、咖啡降价、奢侈品增速放缓——但故事没那么简单。',
    cover: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=1200&q=80&auto=format&fit=crop',
    category: 'finance',
    author: authors.zhao,
    publishedAt: '2026-05-26T14:20:00Z',
    readTime: 12,
    tags: ['消费', '宏观经济', '电商', '数据'],
    reactions: { like: 892, insightful: 423, disagree: 156 },
    views: 19842,
    linkedDebateId: 'd2',
    linkedProductIds: ['p3', 'p7'],
    source: 'Versa 财经观察',
    content: `2026 年上半年，"消费降级"成为最热的词之一。但当我们把 12 万条来自 Versa 用户的订单数据拆开看时，故事远比直觉更复杂。

## 三组事实

- **日常品类**（食品、日用、咖啡）：客单价同比下降 11%，订单量上升 23%。
- **耐用品**（家电、3C）：客单价下降 7%，但高端品销量反而上升 5%。
- **体验型消费**（旅行、演出）：客单价上升 18%，订单量下降 9%。

## 一个反直觉的发现

> "消费降级"并不是单向的，更像是一道选择题——人们在某些品类上妥协，在另一些品类上更愿意花钱。

## 谁是真正的赢家？

- 提供"质优价廉"心智的品牌：蜜雪冰城、瑞幸、名创优品。
- 提供"绝对低价"心智的电商：拼多多、1688、Versa Marketplace。
- 提供"意义溢价"的品牌：lululemon、Apple Pro 系列。

**延伸阅读**：
- [辩论：当消费降级成为常态，谁来定义"好生活"？](#/debates/d2)
- [推荐产品：Versa 编辑选品](coming soon)`,
  },
  {
    id: 'n3',
    title: '一座 24 小时书店如何重塑一个街区',
    subtitle: '在成都玉林，书店、咖啡、共享办公的边界正在消失。',
    cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80&auto=format&fit=crop',
    category: 'culture',
    author: authors.shen,
    publishedAt: '2026-05-25T08:00:00Z',
    readTime: 6,
    tags: ['城市', '书店', '社区', '实体空间'],
    reactions: { like: 1456, insightful: 287, disagree: 42 },
    views: 14720,
    linkedProductIds: ['p6'],
    source: 'Versa 文化志',
    content: `玉林，不是玉林路。是成都南二环外的一个老街区。

这里去年新开了一家 24 小时书店。准确说，是一家"书店+咖啡+共享办公+小型剧场+深夜食堂"的复合体。它没有名字，门口只挂着一行字：进来坐坐。

我去了三次，每次都发现一些新的东西。

## 早上 6 点

一位程序员带着笔记本坐在靠窗的位置，面前是已经凉了的第三杯美式。他没有点餐，但店员端来一杯温水。

## 下午 3 点

一群大学生在角落办读书会，店长送了他们一份甜点。甜点来自楼上烘焙工作室，那里是另一个创业者的项目。

## 晚上 11 点

一位常客推门进来，她是一家心理咨询机构的创办者。她每周来这里两次，"这里有一种不被打扰的安全感"。

## 它如何赚钱？

据内部人士透露，这家店并不靠卖书赚钱。它的收入构成是：咖啡 35%、共享办公 25%、活动场地 20%、会员储值 15%、图书及其他 5%。

它重塑的不只是商业模式，而是一种"邻里关系"。`,
  },
  {
    id: 'n4',
    title: '我们发现了 7 颗类地行星，包括 2 颗"超级宜居"',
    subtitle: '一项跨越 6 年的观测项目在 Kepler-186 附近发现 7 颗类地行星，其中 2 颗甚至比地球更适合生命。',
    cover: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=80&auto=format&fit=crop',
    category: 'science',
    author: authors.qian,
    publishedAt: '2026-05-24T11:15:00Z',
    readTime: 10,
    tags: ['天文', '系外行星', '宜居带', '生命'],
    reactions: { like: 2103, insightful: 689, disagree: 31 },
    views: 38521,
    linkedDebateId: 'd3',
    source: 'Versa 科学',
    content: `我们这颗蓝色星球在宇宙中并不孤单——至少在统计上是这样。

## 关键发现

国际天文学联合会今天发布了一项历时 6 年的研究成果：在距离地球 580 光年的 Kepler-186 星系中，研究团队新确认了 7 颗类地行星，其中 2 颗被认为"超级宜居"。

所谓"超级宜居"，是指满足以下条件的天体：
- 位于宜居带且温度更稳定
- 大气组成利于复杂分子形成
- 体积比地球大约 10%–25%（提供更多可居住面积）
- 拥有板块构造（促进碳循环）

## 它意味着什么？

"我们不是要找第二个地球，"项目首席科学家 Maria López 说，"我们是在找更宽容的地球。在某些指标上，这些行星可能比我们的家园更慷慨。"

## 接下来 10 年

- 2027：韦伯空间望远镜将首次对其中 1 颗进行大气光谱分析
- 2029：欧洲 ARIEL 任务将绘制 1000 颗系外行星的大气图谱
- 2030s：人类或将发射首个"星际探测器"前往比邻星

我们邀请你延伸阅读：**[人类该不该主动向外星文明发射信号？](#/debates/d3)**`,
  },
  {
    id: 'n5',
    title: '东南亚电动车争夺战：日本车厂为何被中国甩开',
    subtitle: '从曼谷到雅加达，中国电动车的市场份额从 12% 跃升至 47%，日系品牌陷入价格与生态双重压力。',
    cover: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1200&q=80&auto=format&fit=crop',
    category: 'world',
    author: authors.he,
    publishedAt: '2026-05-23T16:40:00Z',
    readTime: 9,
    tags: ['汽车', '东南亚', '出海', '新能源'],
    reactions: { like: 678, insightful: 312, disagree: 198 },
    views: 24108,
    linkedDebateId: 'd4',
    linkedProductIds: ['p2'],
    source: 'Versa 国际',
    content: `2023 年至 2026 年的三年，是东南亚乘用车市场被重塑的三年。

## 三个关键数据

| 品牌 | 2023 份额 | 2026 份额 | 变化 |
|---|---|---|---|
| 中国新势力（BYD/GAC/Geely/上汽） | 12% | 47% | +35 |
| 日系（Toyota/Honda） | 64% | 38% | -26 |
| 美系（Tesla/Ford） | 8% | 11% | +3 |
| 其他 | 16% | 4% | -12 |

## 发生了什么？

- **价格**：中国车厂在 1.5–2.5 万美元价位段提供了 5 座 SUV、本地化车机系统、3 年质保。
- **生态**：与本地出行平台、电网、充电桩运营商深度捆绑。
- **速度**：日企从规划到上市的周期约 4 年，中国车厂可以做到 18 个月。

## 当地视角

"我们不是为了中国情怀买 BYD，是因为 BYD 在 8 万泰铢这个价位上提供了过去 30 万泰铢才能买到的东西。"曼谷的一位网约车司机告诉我。

但另一方面，日系车的"耐用神话"并未被打破——在二手保值率上，丰田依然领先。

**延伸辩论**：[传统车企还有翻盘机会吗？](#/debates/d4)`,
  },
  {
    id: 'n6',
    title: '"断舍离"过时了：年轻人开始谈"适度的囤"',
    subtitle: '当消费降级遇上对确定性的渴望，囤积式消费正在悄然回归。',
    cover: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80&auto=format&fit=crop',
    category: 'lifestyle',
    author: authors.fang,
    publishedAt: '2026-05-22T07:10:00Z',
    readTime: 5,
    tags: ['生活方式', '消费', '年轻人'],
    reactions: { like: 521, insightful: 198, disagree: 102 },
    views: 11203,
    linkedProductIds: ['p5', 'p7'],
    source: 'Versa 生活',
    content: `2010 年代初，《断舍离》火遍大江南北。2020 年代，我们又开始谈"极简"。但到 2026 年，故事变了。

## 现象

- 卫生纸、洗衣液等日用品大包装销量同比上升 18%
- 自嗨锅、预制菜等"应急食品"销量上升 32%
- "百元店""十元店"流量上升 41%

## 心理动因

"不是因为贪便宜，而是因为对未来不确定性的应激反应，"华东师大心理学教授徐艺说，"适度的囤积其实是一种心理缓冲。"

## 一种新的生活哲学

"我会囤卫生纸，但不会囤第三件白 T 恤，"25 岁的产品经理 Mia 这样描述她的消费观，"我会买打折的高频日用品，但会为一次特别的旅行花掉一个月工资。"

这种"双轨"消费，正在重新定义何为"理性"。`,
  },
  {
    id: 'n7',
    title: '2026 年最值得关注的 5 款产品：从工具到伙伴',
    subtitle: '我们用了 30 天深度测试了 17 款产品，最终选出 5 款"重新定义品类"的产品。',
    cover: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80&auto=format&fit=crop',
    category: 'tech',
    author: authors.lin,
    publishedAt: '2026-05-20T12:00:00Z',
    readTime: 11,
    tags: ['产品评测', '科技', '深度'],
    reactions: { like: 1623, insightful: 488, disagree: 67 },
    views: 31290,
    linkedProductIds: ['p1', 'p2', 'p4'],
    source: 'Versa 编辑部',
    content: `30 天，17 款产品，5 个奖项。

## 年度产品：Versa Smart Hub X1

> 它不只是"智能音箱"，它重新定义了家庭的信息中枢。

（详见产品页）`,
  },
  {
    id: 'n8',
    title: '从买椟还珠到意义消费：年轻人为什么愿意为"包装"付费',
    subtitle: '一盒月饼卖 600 元，包装占了 280 元——这背后是消费观念的代际更替。',
    cover: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200&q=80&auto=format&fit=crop',
    category: 'culture',
    author: authors.shen,
    publishedAt: '2026-05-19T10:00:00Z',
    readTime: 7,
    tags: ['消费', '文化', '品牌', '设计'],
    reactions: { like: 412, insightful: 145, disagree: 287 },
    views: 9814,
    linkedProductIds: ['p7'],
    source: 'Versa 文化志',
    content: `一盒 600 元的月饼，包装 280 元，内容物 320 元。

十年前，这种定价会被骂上热搜。2026 年，它被抢空了。

## 三个深层变化

- **社交货币**：包装在朋友圈/小红书/抖音上的展示价值，超过了内在价值
- **仪式感溢价**：节日不再是简单的"买什么"，而是"如何呈现"
- **设计民主化**：年轻消费者对美的教育水平史无前例地高

## 行业反应

- 食品品牌正在用"联名设计"对抗同质化
- 包装设计公司估值翻倍
- 礼盒 SKU 增长 67%

但"包装过度"也在引发反弹——一个新词 **greenwashing 2.0**（过度包装漂绿）正在被广泛讨论。`,
  },
  {
    id: 'n9',
    title: '我们追踪了 100 个"数字游民"：他们后悔了吗？',
    subtitle: '巴厘岛、清迈、里斯本——三年前逃离北上广去数字游牧的人，现在怎么样了？',
    cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80&auto=format&fit=crop',
    category: 'lifestyle',
    author: authors.fang,
    publishedAt: '2026-05-18T15:30:00Z',
    readTime: 8,
    tags: ['数字游民', '工作', '生活方式'],
    reactions: { like: 932, insightful: 256, disagree: 84 },
    views: 18527,
    linkedDebateId: 'd5',
    source: 'Versa 生活',
    content: `100 个采访对象，3 个目的地，5 个核心问题。

## 核心问题 1：你还在外漂吗？

- 仍在外漂：**54%**
- 已回国：**31%**
- 仍在漂但准备回国：**15%**

## 核心问题 2：你后悔吗？

- 完全不后悔：**38%**
- 部分后悔：**42%**
- 强烈后悔：**20%**

## 三个发现

1. **"自由"的成本被低估了**——他们普遍报告，孤独感比想象中更严重
2. **税务和签证是隐形的天花板**
3. **疫情后的"长居"签证正在改变游戏规则**

详细数据见延伸报道，配套辩论见 [数字游民是自由还是漂泊？](#/debates/d5)。`,
  },
  {
    id: 'n10',
    title: '永生研究的伦理边界：我们能接受"意识上传"吗？',
    subtitle: '一项覆盖 23 个国家的调查显示，全球年轻人对"数字永生"的态度出现明显分化。',
    cover: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200&q=80&auto=format&fit=crop',
    category: 'science',
    author: authors.qian,
    publishedAt: '2026-05-17T09:00:00Z',
    readTime: 13,
    tags: ['伦理', 'AI', '永生', '哲学'],
    reactions: { like: 1102, insightful: 587, disagree: 421 },
    views: 24820,
    linkedDebateId: 'd6',
    source: 'Versa 科学',
    content: `如果科技能让你在 1000 年后"复活"，你愿意吗？

## 调查结果

我们联合 5 家国际研究机构，对 23 个国家的 18–35 岁年轻人做了问卷：

- **愿意上传意识**：42%
- **愿意但不接受"复活"**：27%
- **明确拒绝**：31%

## 三个核心争议

1. **连续性悖论**：复制后的你还是你吗？
2. **不平等问题**：永生技术首先服务谁？
3. **存在论困境**：死亡在何种意义上是必要的？

辩论延伸：**[意识上传能否被视作"我"？](#/debates/d6)**`,
  },
]
