import { describe, expect, it } from 'vitest'
import { menu, seed } from '../fixtures'
import { normalizeSeedOrder, priceSeedOrder } from '../server/seed'
import type { StoredOrder } from '../types/order'
import {
  averageOrderValue,
  bestSellingOptions,
  countOrders,
  couponUsage,
  describeData,
  ordersOnDate,
  revenueByPaymentMethod,
  totalRevenue,
} from './stats'

// The six seed orders, priced at their own createdAt (same as the server does).
const pricedSeed = (): StoredOrder[] => seed.orders.map((raw) => priceSeedOrder(normalizeSeedOrder(raw)))

// A copy of one seed order with a new id, to build "changed data" cases.
function copyOf(order: StoredOrder, id: string): StoredOrder {
  return { ...order, id }
}

describe('countOrders', () => {
  it('counts the six seed orders', () => {
    expect(countOrders(pricedSeed())).toEqual({ count: 6 })
  })

  it('changes when the data changes', () => {
    const orders = pricedSeed()
    expect(countOrders([...orders, copyOf(orders[0], 'NEW-1')])).toEqual({ count: 7 })
    expect(countOrders([])).toEqual({ count: 0 })
  })
})

describe('totalRevenue', () => {
  it('adds up every payable (Q5): 499500 poisha', () => {
    // 33900 + 71300 + 127100 + 57800 + 86600 + 122800
    expect(totalRevenue(pricedSeed())).toEqual({
      orderCount: 6,
      revenue: { poisha: 499500, text: 'BDT 4,995.00' },
    })
  })

  it('is zero with no orders', () => {
    expect(totalRevenue([]).revenue.poisha).toBe(0)
  })
})

describe('bestSellingOptions', () => {
  it('Fried is the best seller with 10 units, no tie (Q6)', () => {
    expect(bestSellingOptions(pricedSeed(), menu)).toEqual({
      options: [{ optionId: 'fried', name: 'Fried', units: 10 }],
      tie: false,
    })
  })

  it('counts units as line quantity × option qty', () => {
    // ORD-1003 line 1: qty 2 × fried 2 = 4 units
    const orders = pricedSeed().filter((o) => o.id === 'ORD-1003')
    const fried = bestSellingOptions(orders, menu, 20).options.find((o) => o.optionId === 'fried')
    expect(fried?.units).toBe(4)
  })

  it('top N also keeps every option tied with the last place (menu order)', () => {
    // scrambled and sausage both have 8 units
    const { options } = bestSellingOptions(pricedSeed(), menu, 2)
    expect(options.map((o) => [o.optionId, o.units])).toEqual([
      ['fried', 10],
      ['scrambled', 8],
      ['sausage', 8],
    ])
  })

  it('reports a tie at the top and lists every tied option', () => {
    const [order] = pricedSeed()
    const line = { ...order.lines[0], quantity: 1, config: { scrambled: 2, sausage: 2, toast: 1 } }
    const result = bestSellingOptions([{ ...order, lines: [line] }], menu)
    expect(result.tie).toBe(true)
    expect(result.options.map((o) => o.optionId)).toEqual(['scrambled', 'sausage'])
  })

  it('answer follows the data (TC-19)', () => {
    // One more ORD-1005 (qty 2: scrambled 2, sausage 2) adds 4 units to each → both 12, Fried stays 10.
    const extra = pricedSeed().filter((o) => o.id === 'ORD-1005')
    const result = bestSellingOptions([...pricedSeed(), copyOf(extra[0], 'NEW-1')], menu)
    expect(result.tie).toBe(true)
    expect(result.options).toEqual([
      { optionId: 'scrambled', name: 'Scrambled', units: 12 },
      { optionId: 'sausage', name: 'Chicken Sausage', units: 12 },
    ])
  })

  it('returns no options for no orders', () => {
    expect(bestSellingOptions([], menu)).toEqual({ options: [], tie: false })
  })
})

describe('revenueByPaymentMethod', () => {
  it('groups by the method each order records, highest first (Q7)', () => {
    expect(revenueByPaymentMethod(pricedSeed())).toEqual({
      methods: [
        { method: 'card', orderCount: 3, revenue: { poisha: 214500, text: 'BDT 2,145.00' } },
        { method: 'bkash', orderCount: 2, revenue: { poisha: 157900, text: 'BDT 1,579.00' } },
        { method: 'cash', orderCount: 1, revenue: { poisha: 127100, text: 'BDT 1,271.00' } },
      ],
    })
  })

  it('a method that is not in any fixed list still shows up', () => {
    const odd = { ...pricedSeed()[0], id: 'ODD-1', paymentMethod: 'voucher' }
    const methods = revenueByPaymentMethod([odd]).methods
    expect(methods).toEqual([{ method: 'voucher', orderCount: 1, revenue: { poisha: 33900, text: 'BDT 339.00' } }])
  })
})

describe('averageOrderValue', () => {
  it('is total revenue / order count: 499500 / 6 = 83250', () => {
    expect(averageOrderValue(pricedSeed())).toEqual({
      orderCount: 6,
      average: { poisha: 83250, text: 'BDT 832.50' },
    })
  })

  it('rounds half up to a whole poisha', () => {
    const [a] = pricedSeed()
    const one = { ...a, totals: { ...a.totals, payable: 100 } }
    const two = { ...a, id: 'B', totals: { ...a.totals, payable: 101 } }
    expect(averageOrderValue([one, two]).average?.poisha).toBe(101) // 100.5 → 101
  })

  it('has no average when there are no orders', () => {
    expect(averageOrderValue([])).toEqual({ orderCount: 0, average: null })
  })
})

describe('couponUsage', () => {
  it('4 entered the code, 3 really got it, ORD-1006 was too late (Q8)', () => {
    expect(couponUsage(pricedSeed())).toEqual({
      enteredCount: 4,
      appliedCount: 3,
      appliedOrderIds: ['ORD-1001', 'ORD-1003', 'ORD-1005'],
      notApplied: [
        {
          orderId: 'ORD-1006',
          code: 'MORNING15',
          status: 'expired_time',
          reason: 'MORNING15 is valid only before 11:00',
        },
      ],
    })
  })
})

describe('ordersOnDate', () => {
  const tz = menu.shop.timeZone

  it('finds the orders of 20 November in the shop time zone', () => {
    expect(ordersOnDate(pricedSeed(), '2026-11-20', tz)).toEqual({
      ok: true,
      date: '2026-11-20',
      timeZone: tz,
      count: 2,
      orderIds: ['ORD-1001', 'ORD-1002'],
      revenue: { poisha: 105200, text: 'BDT 1,052.00' },
    })
  })

  it('a day with no orders gives zero', () => {
    const result = ordersOnDate(pricedSeed(), '2026-11-25', tz)
    expect(result).toMatchObject({ ok: true, count: 0, orderIds: [] })
  })

  it('uses the given time zone, not the browser one', () => {
    // ORD-1001 is 03:15 UTC on 20 Nov = 22:15 on 19 Nov in New York.
    const result = ordersOnDate(pricedSeed(), '2026-11-19', 'America/New_York')
    expect(result).toMatchObject({ ok: true, orderIds: ['ORD-1001'] })
  })

  it.each(['20 Nov', '2026-13-01', '2026-02-30', '2026-1-5', ''])('rejects a bad date "%s"', (date) => {
    const result = ordersOnDate(pricedSeed(), date, tz)
    expect(result.ok).toBe(false)
  })
})

describe('describeData', () => {
  it('says what it can answer and that there is no customer data', () => {
    const result = describeData()
    expect(result.canAnswer.length).toBeGreaterThanOrEqual(7)
    expect(result.notInData.join(' ')).toMatch(/customer/i)
  })
})
