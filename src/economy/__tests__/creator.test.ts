// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  PLATFORM_CONFIG,
  GIFT_CATALOG,
  sendTip,
  createAffiliateLink,
  trackClick,
  recordConversion,
  getCreatorSummary,
  requestWithdrawal,
  calculateTax,
  generateAnnualTaxRecord,
} from '../creator'

beforeEach(() => {
  localStorage.clear()
})

describe('economy · PLATFORM_CONFIG', () => {
  it('抽成 10%', () => {
    expect(PLATFORM_CONFIG.platformFeeRate).toBe(0.10)
  })
  it('提现最低 ¥100', () => {
    expect(PLATFORM_CONFIG.minWithdrawal).toBe(100)
  })
  it('税起征点 6 万', () => {
    expect(PLATFORM_CONFIG.taxThreshold).toBe(60000)
  })
})

describe('economy · GIFT_CATALOG', () => {
  it('至少 8 个礼物', () => {
    expect(GIFT_CATALOG.length).toBeGreaterThanOrEqual(8)
  })
  it('礼物价格 > 0', () => {
    GIFT_CATALOG.forEach((g) => {
      expect(g.price).toBeGreaterThan(0)
      expect(g.creatorShare).toBeGreaterThan(0)
      expect(g.creatorShare).toBeLessThanOrEqual(1)
    })
  })
})

describe('economy · sendTip', () => {
  it('成功打赏：扣费 + 入账', async () => {
    const tip = await sendTip({ fromUserId: 'u_alice', toUserId: 'u_creator', giftId: 'g_heart' })
    expect(tip.amount).toBe(1)
    expect(tip.status).toBe('completed')
    const summary = await getCreatorSummary('u_creator')
    expect(summary.totalGross).toBe(1)
    expect(summary.totalNet).toBeCloseTo(0.9, 2)
  })

  it('不存在礼物抛错', async () => {
    await expect(sendTip({ fromUserId: 'a', toUserId: 'b', giftId: 'g_notfound' })).rejects.toThrow()
  })

  it('不能给自己打赏', async () => {
    await expect(sendTip({ fromUserId: 'a', toUserId: 'a', giftId: 'g_heart' })).rejects.toThrow()
  })

  it('多笔打赏累加', async () => {
    await sendTip({ fromUserId: 'a', toUserId: 'c', giftId: 'g_heart' })
    await sendTip({ fromUserId: 'b', toUserId: 'c', giftId: 'g_flower' })
    await sendTip({ fromUserId: 'a', toUserId: 'c', giftId: 'g_coffee' })
    const summary = await getCreatorSummary('c')
    expect(summary.totalGross).toBe(1 + 6 + 18)
    expect(summary.bySource.tip.count).toBe(3)
  })
})

describe('economy · 分销', () => {
  it('createAffiliateLink 默认 5% 佣金', async () => {
    const link = await createAffiliateLink({ creatorId: 'cr1', productId: 'p1' })
    expect(link.commissionRate).toBe(0.05)
    expect(link.shortCode).toHaveLength(6)
  })

  it('createAffiliateLink 佣金率上限 30%', async () => {
    const link = await createAffiliateLink({ creatorId: 'cr1', productId: 'p1', commissionRate: 0.5 })
    expect(link.commissionRate).toBe(0.30)
  })

  it('trackClick 增加点击数', async () => {
    const link = await createAffiliateLink({ creatorId: 'cr1', productId: 'p1' })
    const updated = await trackClick(link.shortCode)
    expect(updated?.clicks).toBe(1)
  })

  it('recordConversion 正确计算佣金', async () => {
    const link = await createAffiliateLink({ creatorId: 'cr1', productId: 'p1', commissionRate: 0.10 })
    const r = await recordConversion({ shortCode: link.shortCode, buyerId: 'b1', orderId: 'o1', orderAmount: 1000 })
    expect(r?.conversion.commission).toBe(100) // 10%
    expect(r?.link.conversions).toBe(1)
    const summary = await getCreatorSummary('cr1')
    expect(summary.totalGross).toBe(100)
  })

  it('recordConversion 短码不存在返回 null', async () => {
    const r = await recordConversion({ shortCode: 'NOPE', buyerId: 'b', orderId: 'o', orderAmount: 100 })
    expect(r).toBeNull()
  })
})

describe('economy · 提现', () => {
  it('金额低于 ¥100 抛错', async () => {
    await expect(requestWithdrawal({ creatorId: 'c', amount: 50, method: 'alipay', account: '1234' })).rejects.toThrow()
  })

  it('余额不足抛错', async () => {
    await expect(requestWithdrawal({ creatorId: 'c', amount: 1000, method: 'alipay', account: '1234' })).rejects.toThrow()
  })

  it('成功提现：生成记录 + 标记收益', async () => {
    await sendTip({ fromUserId: 'a', toUserId: 'c', giftId: 'g_rocket' })  // 188
    const w = await requestWithdrawal({ creatorId: 'c', amount: 100, method: 'alipay', account: '13800000000' })
    expect(w.status).toBe('requested')
    expect(w.fee).toBe(1) // max(100*0.005, 1) = 1
    expect(w.account).toBe('138****0000')
  })
})

describe('economy · 税务', () => {
  it('月收入 3k → 0 税', () => {
    const r = calculateTax(36000) // 刚到起征点
    expect(r.taxOwed).toBe(0)
  })

  it('年收入 10 万 → 10% 档 (4000 部分)', () => {
    const r = calculateTax(100000)
    // taxable = 40000, 跨档: 36000*3% + 4000*10% = 1080 + 400 = 1480
    expect(r.taxOwed).toBe(1480)
    expect(r.bracket.rate).toBe(0.10)
  })

  it('年收入 20 万 → 10% 档', () => {
    const r = calculateTax(200000)
    // taxable = 140000, 10% 档: 140000 * 0.10 - 2520 = 11480
    expect(r.taxOwed).toBe(11480)
    expect(r.bracket.rate).toBe(0.10)
  })

  it('年收入 50 万 → 30% 档', () => {
    const r = calculateTax(500000)
    // taxable = 440000, 30% 档: 440000 * 0.30 - 52920 = 79080
    expect(r.taxOwed).toBe(79080)
  })

  it('generateAnnualTaxRecord 正确汇总', async () => {
    await sendTip({ fromUserId: 'a', toUserId: 'c', giftId: 'g_rocket' })  // 188
    await sendTip({ fromUserId: 'b', toUserId: 'c', giftId: 'g_rocket' })
    const rec = await generateAnnualTaxRecord('c', '2026')
    expect(rec.totalIncome).toBe(376)
    expect(rec.taxableIncome).toBe(0)  // 376 < 60000
    expect(rec.taxOwed).toBe(0)
    expect(rec.withholding).toBeGreaterThan(0)
  })
})
