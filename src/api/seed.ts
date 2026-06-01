// ============== 种子数据 ==============
// 包含 30+ 演示用户、20+ 帖子、若干评论/关注/通知/群组
// 这些用户可以登录体验完整社交功能

import type { User, Post, Group, Comment, Follow, Notification, Conversation, Message, Role } from './types'
import { news } from '../data/news'
import { debates } from '../data/debates'
import { products } from '../data/products'
import { getStore, uid, hashPassword, setStore } from './store'

const AVATARS = Array.from({ length: 30 }, (_, i) => `https://i.pravatar.cc/300?img=${(i % 70) + 1}`)
const COVERS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80',
  'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200&q=80',
  'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1200&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80',
]

// 5 个不同角色，方便测试审核/管理员
const DEMO_USERS: Array<Partial<User> & { username: string; password: string; role: Role }> = [
  { username: 'admin', password: 'admin123', role: 'admin', displayName: 'Versa 管理员', bio: '平台的守门人 · 让一切有序运转' },
  { username: 'moderator', password: 'mod123', role: 'auditor', displayName: '林清和', bio: '内容审核员 · 用规范守护社区' },
  { username: 'creator', password: 'creator123', role: 'creator', displayName: '沈听雨', bio: '独立创作者 · 城市与人文观察 | 蓝V认证' },
  { username: 'alice', password: 'alice123', role: 'user', displayName: '爱丽丝', bio: '产品经理 · 关注 AI、消费和设计' },
  { username: 'bob', password: 'bob123', role: 'user', displayName: '鲍勃', bio: '工程师 · 写代码、爱骑行' },
]

// 25 个 NPC 用户，模拟社区氛围
const NPC_NAMES = [
  '青衫客', '鹿鸣', '浮光', '南风', '星河', '远山', '云间月', '莫问', '听雪', '折光',
  '白夜', '余晖', '回声', '拾光', '南山', '望舒', '谷雨', '微岚', '凌霜', '沐雨',
  '若曦', '风吟', '晓月', '清欢', '初晴',
]

const NPC_BIOS = [
  '咖啡因中毒晚期患者',
  '白天上班，晚上写诗',
  '一个会写代码的钢琴老师',
  '户外摄影爱好者',
  '终身学习者',
  '猫奴 · 咖啡控 · 业余咖啡师',
  '科技公司 PM，记录所思',
  '设计改变生活',
  '一个不太正经的吃货',
  '健身 5 年，分享我的训练日常',
  '喜欢深夜跑步的工程师',
  '佛系养花人',
  '数字游民 · 在路上',
  '自由撰稿人，写我所信',
  '前大厂员工，现创业者',
  '建筑系在读 · 关注城市与人',
  '法律人 · 偶尔也文艺',
  '医学生 · 学习使人头秃',
  '小学老师 · 喜欢和孩子们聊天',
  '建筑设计师 · 美即正义',
  '心理咨询师 · 倾听者',
  '数据分析师 · 数据不说谎',
  '建筑师 / 摄影师 / 旅行家',
  '一个想开书店的程序员',
  '每天都在学习新东西',
]

const NPC_HASHTAGS = ['#Versa生活', '#AI时代', '#消费观察', '#设计灵感', '#技术笔记', '#城市漫游', '#读书会', '#深夜电台', '#日常碎片', '#好物推荐', '#思考', '#辩题', '#新发现', '#灵感', '#分享', '#讨论']

const NPC_POST_TEMPLATES = [
  '今天读到一句话："{quote}"，很有感触，分享给 Versa 的朋友们。',
  '刚刚在 Versa 看完一场辩论 — 「{topic}」，正方说得有理，反方也很有说服力。你们站哪边？',
  '刚入手了 {product}，质感超出预期！{tag} #Versa好物',
  '深夜思考：我们这一代人最大的焦虑是什么？是选择太多，还是没得选？',
  '推荐一个 Versa 上的辩论话题：「{topic}」— 我投票了正方，理由有三...',
  '天气好，心情也好。在咖啡馆写完了今天的工作，来 Versa 发个动态。',
  '{tag} 看完 Versa 上一篇关于消费降级的报道，深以为然，但也有不同看法。',
  '朋友推荐了 Versa，用了一周，感受是：终于找到一个把"读什么"和"买什么"打通的平台。',
  '刚刚在 Versa 完成首单，仪式感拉满。',
  '{tag} 今天尝试了一杯新咖啡，搭配 {product}，意外地搭。',
]

const QUOTES = [
  '真正的自由不是你想做什么就做什么，而是你不想做什么就可以不做什么。',
  '人生没有白走的路，每一步都算数。',
  '在信息洪流里，保持思考的能力比获取信息更重要。',
  '我们消费的不只是商品，而是商品所代表的生活方式。',
  '辩论不是为了说服对方，而是在对抗中接近真理。',
  '把简单的事情做到极致，就是不简单。',
  '深度阅读是这个时代的奢侈品。',
  '互联网让我们看到了全世界，也让我们错过了身边人。',
]

export function seedIfEmpty() {
  const store = getStore()
  if (Object.keys(store.users).length > 0) return

  setStore((s) => {
    const newStore = { ...s }

    // ============== 创建 5 个 demo 用户 ==============
    const demoUserIds: string[] = []
    DEMO_USERS.forEach((u, i) => {
      const id = uid('usr')
      demoUserIds.push(id)
      const user: User = {
        id,
        username: u.username,
        email: `${u.username}@versa.app`,
        displayName: u.displayName!,
        avatar: AVATARS[i],
        cover: COVERS[i % COVERS.length],
        bio: u.bio!,
        role: u.role,
        verified: u.role === 'creator' || u.role === 'admin',
        reputation: 100 + i * 200,
        badges: u.role === 'admin' ? ['system_mod', 'creator_mod'] : u.role === 'creator' ? ['top_creator'] : u.role === 'auditor' ? ['moderator'] : ['early_adopter'],
        followers: [],
        following: [],
        postsCount: 0,
        createdAt: new Date(Date.now() - (i + 1) * 7 * 24 * 3600 * 1000).toISOString(),
        lastSeenAt: new Date().toISOString(),
        stats: {
          articlesRead: 5 + i * 3,
          debatesJoined: i,
          argumentsPosted: i,
          productsPurchased: i % 3,
          postsCreated: 0,
          commentsPosted: 0,
          likesReceived: 0,
        },
        privacy: { profilePublic: true, showActivity: true, allowMessages: 'everyone' },
        status: 'active',
      }
      newStore.users[id] = user
      newStore.usersByUsername[u.username] = id
      newStore.usersByEmail[user.email!] = id
      newStore.passwords[user.email!] = hashPassword(u.password)
    })

    // ============== 创建 25 个 NPC ==============
    const npcIds: string[] = []
    NPC_NAMES.forEach((name, i) => {
      const id = uid('usr')
      npcIds.push(id)
      const username = 'user_' + (i + 1) + '_' + Math.random().toString(36).slice(2, 6)
      const user: User = {
        id,
        username,
        displayName: name,
        avatar: AVATARS[(i + 5) % AVATARS.length],
        cover: COVERS[(i + 2) % COVERS.length],
        bio: NPC_BIOS[i % NPC_BIOS.length],
        role: 'user',
        verified: i % 7 === 0,
        reputation: 50 + Math.floor(Math.random() * 500),
        badges: i % 3 === 0 ? ['early_adopter'] : [],
        followers: [],
        following: [],
        postsCount: 0,
        createdAt: new Date(Date.now() - (10 + i) * 24 * 3600 * 1000).toISOString(),
        lastSeenAt: new Date(Date.now() - Math.random() * 3 * 24 * 3600 * 1000).toISOString(),
        stats: {
          articlesRead: 3 + i,
          debatesJoined: i % 4,
          argumentsPosted: i % 5,
          productsPurchased: i % 3,
          postsCreated: 0,
          commentsPosted: 0,
          likesReceived: 0,
        },
        privacy: { profilePublic: true, showActivity: true, allowMessages: i % 2 === 0 ? 'everyone' : 'followers' },
        status: 'active',
      }
      newStore.users[id] = user
      newStore.usersByUsername[username] = id
    })

    const allUserIds = [...demoUserIds, ...npcIds]

    // ============== 创建 follow 关系 ==============
    // 默认 admin 和 creator 关注了很多人
    const followPairs: Array<[string, string]> = []
    demoUserIds.forEach((uid) => {
      npcIds.slice(0, 8).forEach((nid) => followPairs.push([uid, nid]))
    })
    // NPC 之间相互关注
    npcIds.forEach((uid, i) => {
      npcIds.slice(i + 1, i + 5).forEach((fid) => followPairs.push([uid, fid]))
    })
    followPairs.forEach(([follower, followee]) => {
      const id = uid('flw')
      newStore.follows[id] = {
        id, followerId: follower, followeeId: followee,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 3600 * 1000).toISOString(),
      }
      newStore.users[follower].following.push(followee)
      newStore.users[followee].followers.push(follower)
    })

    // ============== 创建帖子 ==============
    const postIds: string[] = []
    const postSamples: Array<Partial<Post> & { authorIdx: number }> = [
      {
        authorIdx: 0, // admin
        type: 'text',
        content: '欢迎来到 Versa！这里是新闻×辩论×购物的三体融合社区。无论你是来读深度报道、参与观点交锋，还是发现好物，我们都为你准备好了。\n\n记得遵守社区规范，让这里成为有趣、有料、有温度的家园。',
        hashtags: ['#Versa官方', '#欢迎', '#社区'],
      },
      {
        authorIdx: 1, // moderator
        type: 'text',
        content: '作为社区审核员，每天最开心的时刻是看到大家理性讨论。最不希望看到的，是无意义的人身攻击。\n\n请记住：你可以不同意别人的观点，但请尊重发表观点的人。',
        hashtags: ['#社区规范', '#理性讨论'],
      },
      {
        authorIdx: 2, // creator
        type: 'image',
        content: '今天在玉林路的 24 小时书店待了一下午，窗外是成都的细雨，窗内是一群埋头看书的人。这种"被时间遗忘"的感觉，是 Versa 想要营造的。\n\n新一期「城市与书店」专栏已经在写了，敬请期待。',
        images: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1000&q=80'],
        hashtags: ['#城市与书店', '#成都', '#Versa生活'],
      },
      {
        authorIdx: 3, // alice
        type: 'text',
        content: '刚在 Versa 上读完《生成式 AI 进入"协作时代"》这篇报道，最大的启发是：好的 AI 不再只是"答题机器"，而是会主动反问。这让我重新思考了产品设计中的"引导式"与"指令式"权衡。\n\n想听听大家的看法。',
        hashtags: ['#AI', '#产品设计', '#深度阅读'],
        refType: 'news',
        refId: 'n1',
      },
      {
        authorIdx: 4, // bob
        type: 'image',
        content: '骑行 50 公里到郊外，顺便测试了一下新入手的 Garmin 码表。',
        images: ['https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1000&q=80'],
        hashtags: ['#骑行', '#Garmin', '#周末'],
      },
      {
        authorIdx: 6, // npc
        type: 'text',
        content: '深夜突然想问大家一个问题：你觉得"消费降级"是真命题，还是伪命题？\n\n我观察身边的朋友，有人在日用品上更省钱了，但在旅行、演出上反而更敢花钱。这是消费降级还是消费升级？',
        hashtags: ['#消费', '#思考', '#辩题'],
        refType: 'debate',
        refId: 'd2',
      },
      {
        authorIdx: 7,
        type: 'image',
        content: 'MUJI 的 5 件白 T 到货，衣橱终于"减负"了。',
        images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1000&q=80'],
        hashtags: ['#极简', '#MUJI', '#好物'],
        refType: 'shop',
        refId: 'p5',
      },
      {
        authorIdx: 8,
        type: 'text',
        content: '第一次在 Versa 写评论，有点紧张。这里的人真的在认真讨论问题，而不是刷存在。喜欢。',
        hashtags: ['#新人报到', '#Versa生活'],
      },
      {
        authorIdx: 9,
        type: 'image',
        content: '下班路上的晚霞，是今天最治愈的一刻。',
        images: ['https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1000&q=80'],
        hashtags: ['#晚霞', '#日常', '#治愈'],
      },
      {
        authorIdx: 10,
        type: 'text',
        content: '刚在 Versa 参加了一场辩论：「意识上传能否被视作我？」 我的观点是：连续性才是身份的核心。但很多反方朋友的反驳也很有力。\n\n推荐大家去参与，感受不同观点的碰撞。',
        hashtags: ['#辩论', '#意识', '#哲学'],
        refType: 'debate',
        refId: 'd6',
      },
      {
        authorIdx: 11,
        type: 'poll',
        content: 'Versa 各位，下一杯咖啡你选什么？',
        poll: {
          question: '你的下一杯咖啡是？',
          options: [
            { id: 'p1', text: '美式', votes: npcIds.slice(0, 6) },
            { id: 'p2', text: '拿铁', votes: npcIds.slice(6, 10) },
            { id: 'p3', text: '手冲精品', votes: npcIds.slice(2, 5) },
            { id: 'p4', text: '不喝咖啡', votes: npcIds.slice(0, 2) },
          ],
        },
        hashtags: ['#咖啡', '#投票'],
      },
      {
        authorIdx: 12,
        type: 'text',
        content: '读书报告：《百年孤独》50 周年纪念版。\n\n"多年以后，奥雷里亚诺·布恩迪亚上校站在行刑队面前，准会想起父亲带他去见识冰块的那个遥远的下午。"\n\n每次重读第一句，都有新的感受。这就是经典的魅力。',
        hashtags: ['#读书', '#马尔克斯', '#经典'],
        refType: 'shop',
        refId: 'p11',
      },
      {
        authorIdx: 13,
        type: 'image',
        content: '新装备开箱：戴森 V16。激光显尘这个功能太震撼了，让我看到了以前没注意过的灰尘。',
        images: ['https://images.unsplash.com/photo-1558317374-067fb5f30001?w=1000&q=80'],
        hashtags: ['#开箱', '#戴森', '#清洁'],
        refType: 'shop',
        refId: 'p9',
      },
      {
        authorIdx: 14,
        type: 'text',
        content: '想问 Versa 的朋友们：你们觉得 BYD 真的会颠覆日本车在东南亚的统治吗？我看了一下最近的报道，似乎已经是定局了。',
        hashtags: ['#汽车', '#BYD', '#出海'],
        refType: 'news',
        refId: 'n5',
      },
      {
        authorIdx: 15,
        type: 'text',
        content: '今天在 Versa 给一家咖啡店老板推荐了"断舍离"哲学，她笑着说"我做不到"——这也许是 2026 年最真实的消费心理。\n\n理想和现实之间，总有距离。',
        hashtags: ['#随想', '#消费'],
      },
      {
        authorIdx: 16,
        type: 'image',
        content: '在 Versa 买的 lululemon 紧身裤到了 — 真的像"第二层皮肤"一样舒服。贵，但值。',
        images: ['https://images.unsplash.com/photo-1591291621164-2c6367723315?w=1000&q=80'],
        hashtags: ['#lululemon', '#瑜伽', '#好物'],
        refType: 'shop',
        refId: 'p8',
      },
      {
        authorIdx: 17,
        type: 'text',
        content: '产品发布：刚完成一个 6 周的产品需求文档。如果有 PM 同行在 Versa，欢迎交流 PRD 模板。',
        hashtags: ['#产品', '#PRD', '#交流'],
      },
      {
        authorIdx: 18,
        type: 'text',
        content: '今天 Versa 给我推荐了一个辩题：「传统车企还有翻盘机会吗？」—— 我投了反方。理由：他们的产品决策链条太长。',
        hashtags: ['#辩论', '#汽车', '#思考'],
        refType: 'debate',
        refId: 'd4',
      },
      {
        authorIdx: 19,
        type: 'image',
        content: '周末爬山，遇到一只超可爱的柯基！',
        images: ['https://images.unsplash.com/photo-1517849845537-4d257902454a?w=1000&q=80'],
        hashtags: ['#周末', '#爬山', '#柯基'],
      },
      {
        authorIdx: 20,
        type: 'text',
        content: '在 Versa 看了 10 篇深度文章 + 参与了 3 场辩论，感觉脑子被激活了。强烈推荐每个想"用脑"的朋友试试。',
        hashtags: ['#推荐', '#Versa体验'],
      },
    ]

    postSamples.forEach((sample, i) => {
      const authorId = allUserIds[sample.authorIdx] || allUserIds[0]
      const id = uid('pst')
      postIds.push(id)
      const reactions: Record<string, string[]> = {
        like: npcIds.slice(0, Math.floor(Math.random() * 6) + 1),
        love: npcIds.slice(0, Math.floor(Math.random() * 4)),
        insightful: npcIds.slice(0, Math.floor(Math.random() * 3)),
        disagree: npcIds.slice(0, Math.floor(Math.random() * 2)),
        laugh: [],
        sad: [],
        fire: npcIds.slice(0, Math.floor(Math.random() * 2)),
      }
      const post: Post = {
        id,
        authorId,
        type: sample.type as any,
        content: sample.content!,
        images: (sample as any).images || [],
        hashtags: sample.hashtags || [],
        mentions: [],
        refType: (sample as any).refType || 'none',
        refId: (sample as any).refId,
        poll: (sample as any).poll,
        reactions,
        commentsCount: 0,
        repostsCount: Math.floor(Math.random() * 5),
        sharesCount: Math.floor(Math.random() * 3),
        views: 50 + Math.floor(Math.random() * 500),
        status: 'published',
        flagsCount: 0,
        createdAt: new Date(Date.now() - (postSamples.length - i) * 3 * 3600 * 1000).toISOString(),
      }
      newStore.posts[id] = post
      newStore.users[authorId].postsCount += 1
      newStore.users[authorId].stats.postsCreated += 1
      Object.values(reactions).forEach((users) => {
        users.forEach((u) => {
          if (newStore.users[u]) newStore.users[u].stats.likesReceived += 1
        })
      })
    })

    // ============== 评论 ==============
    const commentSamples = [
      { postIdx: 0, content: '终于等到 Versa 上线了，期待已久！', authorIdx: 6 },
      { postIdx: 0, content: '设计好美！已经是我的常用 App 了。', authorIdx: 7 },
      { postIdx: 2, content: '成都的独立书店确实是一个精神地标。', authorIdx: 8 },
      { postIdx: 2, content: '关注你的「城市与书店」专栏！', authorIdx: 9 },
      { postIdx: 3, content: '同意"AI 应该反问"这个观点。', authorIdx: 10 },
      { postIdx: 3, content: '但反问太多会让人感到烦。', authorIdx: 11, parentIdx: 0 },
      { postIdx: 5, content: '我认为是真命题。我自己的消费确实在调整。', authorIdx: 12 },
      { postIdx: 5, content: '我觉得更多是"消费结构变化"，不是降级。', authorIdx: 13 },
      { postIdx: 10, content: '投了拿铁一票 :)', authorIdx: 14 },
      { postIdx: 11, content: '经典就是经典！', authorIdx: 15 },
    ]
    commentSamples.forEach((c) => {
      const post = newStore.posts[postIds[c.postIdx]]
      if (!post) return
      const id = uid('cmt')
      const authorId = allUserIds[c.authorIdx] || allUserIds[0]
      newStore.comments[id] = {
        id, postId: post.id, authorId, content: c.content,
        reactions: { like: npcIds.slice(0, 2), love: [], insightful: [], disagree: [], laugh: [], sad: [], fire: [] },
        createdAt: new Date(Date.now() - Math.random() * 24 * 3600 * 1000).toISOString(),
        status: 'published',
      }
      post.commentsCount += 1
    })

    // ============== 群组 ==============
    const groupSamples: Array<Partial<Group>> = [
      { name: 'Versa · 深度阅读', description: '每周读一本书、讨论一个观点', cover: COVERS[0], module: 'news', tags: ['#阅读', '#思考'] },
      { name: 'AI 产品经理联盟', description: 'AI 产品人的聚集地', cover: COVERS[1], module: 'none', tags: ['#AI', '#产品'] },
      { name: '理性消费研究所', description: '我们不消费主义，也不反消费主义，我们只做聪明的消费者', cover: COVERS[2], module: 'shop', tags: ['#消费', '#理性'] },
      { name: '辩论之夜', description: '每周一场主题辩论，线下线上同步', cover: COVERS[3], module: 'debate', tags: ['#辩论', '#线下'] },
      { name: '数字游民社区', description: '在路上的人，不孤独', cover: COVERS[4], module: 'lifestyle', tags: ['#数字游民'] },
    ]
    const groupIds: string[] = []
    groupSamples.forEach((g, i) => {
      const id = uid('grp')
      groupIds.push(id)
      newStore.groups[id] = {
        id, name: g.name!, description: g.description!, cover: g.cover!,
        type: 'public', module: g.module as any, memberCount: 0, admins: [allUserIds[2]],
        createdAt: new Date(Date.now() - (i + 1) * 14 * 24 * 3600 * 1000).toISOString(),
        tags: g.tags || [],
      }
      // 加入一些成员
      allUserIds.slice(0, 12 + i * 2).forEach((userId) => {
        const mid = uid('gmb')
        newStore.groupMembers[mid] = { id: mid, groupId: id, userId, role: userId === allUserIds[2] ? 'owner' : 'member', joinedAt: new Date().toISOString() }
        newStore.groups[id].memberCount += 1
      })
    })

    // ============== 通知 ==============
    const notificationSamples: Array<{ recipientIdx: number; actorIdx: number; type: any; targetId: string }> = [
      { recipientIdx: 3, actorIdx: 4, type: 'follow', targetId: allUserIds[4] },
      { recipientIdx: 3, actorIdx: 5, type: 'like', targetId: postIds[3] },
      { recipientIdx: 3, actorIdx: 6, type: 'comment', targetId: postIds[3] },
      { recipientIdx: 2, actorIdx: 7, type: 'love', targetId: postIds[2] },
      { recipientIdx: 2, actorIdx: 8, type: 'mention', targetId: postIds[2] },
      { recipientIdx: 0, actorIdx: 9, type: 'post_flagged', targetId: postIds[5] },
    ]
    notificationSamples.forEach((n) => {
      const id = uid('ntf')
      newStore.notifications[id] = {
        id,
        recipientId: allUserIds[n.recipientIdx],
        actorId: allUserIds[n.actorIdx],
        type: n.type,
        targetType: n.type === 'follow' ? 'user' : 'post',
        targetId: n.targetId,
        read: false,
        createdAt: new Date(Date.now() - Math.random() * 6 * 3600 * 1000).toISOString(),
      }
    })

    // ============== 消息（1v1 聊天） ==============
    const convos: Array<{ participants: [number, number]; messages: Array<{ authorIdx: 0 | 1; content: string }> }> = [
      {
        participants: [3, 4],
        messages: [
          { authorIdx: 0, content: '嗨，看了你发的骑行照片，太赞了！' },
          { authorIdx: 1, content: '谢谢！那天天气确实好。' },
          { authorIdx: 0, content: '下次一起去？' },
          { authorIdx: 1, content: '好啊，约个时间！' },
        ],
      },
      {
        participants: [3, 2],
        messages: [
          { authorIdx: 0, content: '沈老师好，关注了你的专栏。' },
          { authorIdx: 1, content: '谢谢支持！有什么想法随时聊。' },
        ],
      },
    ]
    convos.forEach((c) => {
      const id = uid('cnv')
      const partIds = c.participants.map((i) => allUserIds[i]) as [string, string]
      newStore.conversations[id] = {
        id,
        participants: partIds,
        type: 'direct',
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: c.messages[c.messages.length - 1].content,
        unreadCount: { [partIds[0]]: 0, [partIds[1]]: 1 },
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      }
      c.messages.forEach((m) => {
        const mid = uid('msg')
        newStore.messages[mid] = {
          id: mid, conversationId: id,
          senderId: partIds[m.authorIdx],
          content: m.content,
          readBy: [partIds[m.authorIdx]],
          createdAt: new Date(Date.now() - (c.messages.length - c.messages.indexOf(m)) * 3600 * 1000).toISOString(),
        }
      })
    })

    // ============== 举报 ==============
    newStore.reports[uid('rpt')] = {
      id: uid('rpt'),
      reporterId: allUserIds[9],
      targetType: 'post',
      targetId: postIds[5],
      reason: 'misinformation',
      description: '这个观点需要更多数据支撑',
      status: 'pending',
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    }

    // ============== 三模块数据 ==============
    newStore.news = news
    newStore.debates = debates
    newStore.products = products

    return newStore
  })
}

export const DEMO_ACCOUNTS = DEMO_USERS.map((u) => ({
  username: u.username, password: u.password, role: u.role, displayName: u.displayName,
}))
