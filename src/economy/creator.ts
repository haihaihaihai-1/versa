/**
 * Versa · 创作者经济核心 (v13.0)
 *
 * 4 大子系统：
 * 1. 打赏 (tip)  - 粉丝向创作者打赏虚拟礼物
 * 2. 分销 (aff)  - 创作者带货，按佣金比例分成
 * 3. 收益 (earn)  - 收益累计、提现、税务记录
 * 4. 礼物 (gift)  - 平台定义的虚拟礼物库
 */

import { createRepository } from '../api/repository'
import { uid } from '../lib/utils'

// ============== 类型 ==============

export type GiftKind = 'sticker' | 'animation' | 'badge' | 'super_comment'

export interface Gift {
  id: string
  name: string
  kind: GiftKind
  emoji: string
  price: number  // CNY
  /** 创作者实际获得 (1 - 平台抽成) */
  creatorShare: number
  animation?: string
}

export interface Tip {
  id: string
  fromUserId: string
  toUserId: string
  giftId: string
  amount: number
  message?: string
  refType?: 'post' | 'live' | 'debate' | 'product' | 'profile'
  refId?: string
  createdAt: string
  status: 'pending' | 'completed' | 'refunded'
}

export interface AffiliateLink {
  id: string
  creatorId: string
  productId: string
  shortCode: string  // versa.app/r/abc123
  commissionRate: number  // 0.05 = 5%
  clicks: number
  conversions: number
  revenue: number
  createdAt: string
}

export interface AffiliateConversion {
  id: string
  linkId: string
  buyerId: string
  orderId: string
  amount: number
  commission: number
  createdAt: string
}

export interface CreatorEarning {
  id: string
  creatorId: string
  source: 'tip' | 'affiliate' | 'subscription' | 'paid_content' | 'ad_revenue'
  sourceId: string
  gross: number
  platformFee: number
  net: number
  status: 'pending' | 'cleared' | 'withdrawn' | 'reversed'
  period: string  // YYYY-MM
  createdAt: string
  clearedAt?: string
  withdrawnAt?: string
}

export interface Withdrawal {
  id: string
  creatorId: string
  amount: number
  fee: number
  method: 'alipay' | 'wechat' | 'bank'
  account: string  // 脱敏后账号
  status: 'requested' | 'processing' | 'completed' | 'rejected'
  reason?: string
  requestedAt: string
  processedAt?: string
}

export interface TaxRecord {
  id: string
  creatorId: string
  period: string  // YYYY
  totalIncome: number
  taxableIncome: number
  taxRate: number
  taxOwed: number
  withholding: number
  status: 'draft' | 'filed' | 'paid'
  filedAt?: string
}

// ============== 平台配置 ==============

export const PLATFORM_CONFIG = {
  /** 平台抽成 (0.10 = 10%) */
  platformFeeRate: 0.10,
  /** 提现最低金额 */
  minWithdrawal: 100,
  /** 提现手续费率 */
  withdrawalFeeRate: 0.005,
  /** 提现最低手续费 */
  minWithdrawalFee: 1,
  /** 税务起征点 (年收入) */
  taxThreshold: 60000,
  /** 个税超额累进 */
  taxBrackets: [
    { upTo: 36000, rate: 0.03, deduction: 0 },
    { upTo: 144000, rate: 0.10, deduction: 2520 },
    { upTo: 300000, rate: 0.20, deduction: 16920 },
    { upTo: 420000, rate: 0.25, deduction: 31920 },
    { upTo: 660000, rate: 0.30, deduction: 52920 },
    { upTo: 960000, rate: 0.35, deduction: 85920 },
    { upTo: Infinity, rate: 0.45, deduction: 181920 },
  ] as const,
  /** 默认分销佣金率 */
  defaultCommissionRate: 0.05,
  /** 最高分销佣金率 */
  maxCommissionRate: 0.30,
}

// ============== 礼物库 (内置) ==============

export const GIFT_CATALOG: Gift[] = [
  { id: 'g_heart', name: '小心心', kind: 'sticker', emoji: '❤️', price: 1, creatorShare: 0.9 },
  { id: 'g_flower', name: '鲜花', kind: 'sticker', emoji: '🌹', price: 6, creatorShare: 0.9 },
  { id: 'g_coffee', name: '咖啡', kind: 'sticker', emoji: '☕', price: 18, creatorShare: 0.9 },
  { id: 'g_cake', name: '蛋糕', kind: 'sticker', emoji: '🎂', price: 66, creatorShare: 0.85 },
  { id: 'g_rocket', name: '火箭', kind: 'animation', emoji: '🚀', price: 188, creatorShare: 0.85 },
  { id: 'g_castle', name: '城堡', kind: 'animation', emoji: '🏰', price: 666, creatorShare: 0.80 },
  { id: 'g_crown', name: '皇冠', kind: 'badge', emoji: '👑', price: 1888, creatorShare: 0.80 },
  { id: 'g_super', name: '超级留言', kind: 'super_comment', emoji: '📢', price: 50, creatorShare: 0.85 },
]

// ============== Repositories ==============

const tipRepo = createRepository<Tip>('tips')
const affLinkRepo = createRepository<AffiliateLink>('affiliate_links')
const affConvRepo = createRepository<AffiliateConversion>('affiliate_conversions')
const earningRepo = createRepository<CreatorEarning>('creator_earnings')
const withdrawRepo = createRepository<Withdrawal>('withdrawals')
const taxRepo = createRepository<TaxRecord>('tax_records')

// ============== 1. 打赏 ==============

export interface SendTipInput {
  fromUserId: string
  toUserId: string
  giftId: string
  message?: string
  refType?: Tip['refType']
  refId?: string
}

export async function sendTip(input: SendTipInput): Promise<Tip> {
  const gift = GIFT_CATALOG.find((g) => g.id === input.giftId)
  if (!gift) throw new Error(`Gift ${input.giftId} 不存在`)
  if (input.fromUserId === input.toUserId) throw new Error('不能给自己打赏')

  const tip: Tip = {
    id: uid('tip'),
    fromUserId: input.fromUserId,
    toUserId: input.toUserId,
    giftId: input.giftId,
    amount: gift.price,
    message: input.message,
    refType: input.refType,
    refId: input.refId,
    createdAt: new Date().toISOString(),
    status: 'completed',
  }
  await tipRepo.create(tip)

  // 入账
  const platformFee = tip.amount * PLATFORM_CONFIG.platformFeeRate
  const net = tip.amount - platformFee
  await earningRepo.create({
    id: uid('earn'),
    creatorId: input.toUserId,
    source: 'tip',
    sourceId: tip.id,
    gross: tip.amount,
    platformFee,
    net,
    status: 'cleared',  // 打赏实时入账
    period: new Date().toISOString().slice(0, 7),
    createdAt: tip.createdAt,
    clearedAt: tip.createdAt,
  })

  return tip
}

// ============== 2. 分销 ==============

export function generateShortCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export interface CreateLinkInput {
  creatorId: string
  productId: string
  commissionRate?: number
}

export async function createAffiliateLink(input: CreateLinkInput): Promise<AffiliateLink> {
  const rate = Math.min(
    input.commissionRate ?? PLATFORM_CONFIG.defaultCommissionRate,
    PLATFORM_CONFIG.maxCommissionRate
  )
  const link: AffiliateLink = {
    id: uid('aff'),
    creatorId: input.creatorId,
    productId: input.productId,
    shortCode: generateShortCode(),
    commissionRate: rate,
    clicks: 0,
    conversions: 0,
    revenue: 0,
    createdAt: new Date().toISOString(),
  }
  return await affLinkRepo.create(link)
}

export async function trackClick(shortCode: string): Promise<AffiliateLink | null> {
  const list = await affLinkRepo.list({ filter: { shortCode } })
  const link = list.items[0]
  if (!link) return null
  return await affLinkRepo.update(link.id, { clicks: link.clicks + 1 })
}

export interface RecordConversionInput {
  shortCode: string
  buyerId: string
  orderId: string
  orderAmount: number
}

export async function recordConversion(input: RecordConversionInput): Promise<{ link: AffiliateLink; conversion: AffiliateConversion } | null> {
  const list = await affLinkRepo.list({ filter: { shortCode: input.shortCode } })
  const link = list.items[0]
  if (!link) return null
  const commission = Math.round(input.orderAmount * link.commissionRate * 100) / 100
  const platformFee = Math.round(commission * PLATFORM_CONFIG.platformFeeRate * 100) / 100
  const net = commission - platformFee

  const conversion: AffiliateConversion = {
    id: uid('ac'),
    linkId: link.id,
    buyerId: input.buyerId,
    orderId: input.orderId,
    amount: input.orderAmount,
    commission,
    createdAt: new Date().toISOString(),
  }
  await affConvRepo.create(conversion)

  const updatedLink = await affLinkRepo.update(link.id, {
    conversions: link.conversions + 1,
    revenue: link.revenue + commission,
  })

  await earningRepo.create({
    id: uid('earn'),
    creatorId: link.creatorId,
    source: 'affiliate',
    sourceId: conversion.id,
    gross: commission,
    platformFee,
    net,
    status: 'pending',  // 分销有退货期
    period: new Date().toISOString().slice(0, 7),
    createdAt: conversion.createdAt,
  })

  return { link: updatedLink!, conversion }
}

// ============== 3. 收益 ==============

export interface CreatorEarningSummary {
  totalGross: number
  totalNet: number
  totalWithdrawn: number
  pending: number
  bySource: Record<string, { gross: number; net: number; count: number }>
  byMonth: Record<string, number>
}

export async function getCreatorSummary(creatorId: string): Promise<CreatorEarningSummary> {
  const all = await earningRepo.list({ filter: { creatorId }, perPage: 1000 })
  const summary: CreatorEarningSummary = {
    totalGross: 0,
    totalNet: 0,
    totalWithdrawn: 0,
    pending: 0,
    bySource: {},
    byMonth: {},
  }
  for (const e of all.items) {
    summary.totalGross += e.gross
    summary.totalNet += e.net
    if (e.status === 'withdrawn') summary.totalWithdrawn += e.net
    if (e.status === 'pending' || e.status === 'cleared') summary.pending += e.net
    const src = summary.bySource[e.source] || { gross: 0, net: 0, count: 0 }
    src.gross += e.gross
    src.net += e.net
    src.count += 1
    summary.bySource[e.source] = src
    summary.byMonth[e.period] = (summary.byMonth[e.period] || 0) + e.net
  }
  return summary
}

// ============== 4. 提现 ==============

export interface RequestWithdrawalInput {
  creatorId: string
  amount: number
  method: Withdrawal['method']
  account: string
}

export async function requestWithdrawal(input: RequestWithdrawalInput): Promise<Withdrawal> {
  if (input.amount < PLATFORM_CONFIG.minWithdrawal) {
    throw new Error(`提现金额不能低于 ¥${PLATFORM_CONFIG.minWithdrawal}`)
  }
  const summary = await getCreatorSummary(input.creatorId)
  if (input.amount > summary.pending) {
    throw new Error(`可提现余额不足,当前: ¥${summary.pending.toFixed(2)}`)
  }
  const fee = Math.max(input.amount * PLATFORM_CONFIG.withdrawalFeeRate, PLATFORM_CONFIG.minWithdrawalFee)

  const w: Withdrawal = {
    id: uid('wd'),
    creatorId: input.creatorId,
    amount: input.amount,
    fee,
    method: input.method,
    account: maskAccount(input.method, input.account),
    status: 'requested',
    requestedAt: new Date().toISOString(),
  }
  await withdrawRepo.create(w)

  // 标记对应收益为 withdrawn (简单实现: 标记所有 pending 为 withdrawn)
  // 实际生产应该做 FIFO 配对
  const all = await earningRepo.list({ filter: { creatorId: input.creatorId, status: 'pending' }, perPage: 1000 })
  for (const e of all.items) {
    await earningRepo.update(e.id, { status: 'withdrawn', withdrawnAt: w.requestedAt })
  }

  return w
}

function maskAccount(method: Withdrawal['method'], account: string): string {
  if (method === 'bank') return account.replace(/^(.{4}).+(.{4})$/, '$1****$2')
  if (account.length <= 7) return account.slice(0, 2) + '****' + account.slice(-2)
  return account.slice(0, 3) + '****' + account.slice(-4)
}

// ============== 5. 税务 ==============

export function calculateTax(yearlyIncome: number): { taxOwed: number; bracket: typeof PLATFORM_CONFIG.taxBrackets[number] } {
  if (yearlyIncome <= PLATFORM_CONFIG.taxThreshold) {
    return { taxOwed: 0, bracket: PLATFORM_CONFIG.taxBrackets[0] }
  }
  const taxable = yearlyIncome - PLATFORM_CONFIG.taxThreshold
  for (const b of PLATFORM_CONFIG.taxBrackets) {
    if (taxable <= b.upTo) {
      return {
        taxOwed: Math.max(0, taxable * b.rate - b.deduction),
        bracket: b,
      }
    }
  }
  return { taxOwed: 0, bracket: PLATFORM_CONFIG.taxBrackets[0] }
}

export async function generateAnnualTaxRecord(creatorId: string, year: string): Promise<TaxRecord> {
  const all = await earningRepo.list({ filter: { creatorId }, perPage: 1000 })
  const yearEarnings = all.items.filter((e) => e.createdAt.startsWith(year))
  const totalIncome = yearEarnings.reduce((s, e) => s + e.gross, 0)
  const taxableIncome = Math.max(0, totalIncome - PLATFORM_CONFIG.taxThreshold)
  const { taxOwed, bracket } = calculateTax(totalIncome)
  const taxRate = bracket.rate

  // 已代扣 (平台费部分)
  const withholding = yearEarnings.reduce((s, e) => s + e.platformFee, 0)

  const rec: TaxRecord = {
    id: uid('tax'),
    creatorId,
    period: year,
    totalIncome,
    taxableIncome,
    taxRate,
    taxOwed,
    withholding,
    status: 'draft',
  }
  return await taxRepo.create(rec)
}

export const _internals = {
  tipRepo,
  affLinkRepo,
  affConvRepo,
  earningRepo,
  withdrawRepo,
  taxRepo,
}
