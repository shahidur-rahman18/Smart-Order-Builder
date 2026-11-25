import { describe, expect, it } from 'vitest'
import { menu, seed } from '../fixtures'
import { priceCart } from '../engine/pricing'
import { addItem } from './cart'
import { checkout, getOrders } from './checkout'
import { normalizeSeedOrder, priceSeedOrder } from './seed'
import { readState } from './state'
import { getStock } from './stockView'
import { configA } from '../test/builders'
import { ok } from '../test/serverHelpers'
import type { SeedOrder } from '../types/seed'

const seedOrders = () => ok(getOrders()).orders.filter((o) => o.source === 'seed')

describe('seed orders', () => {
  it('loads every seed order on the first request, keeping its id and time', () => {
    const orders = seedOrders()
    expect(orders.map((o) => o.id)).toEqual(seed.orders.map((o) => o.id))
    orders.forEach((order, i) => {
      expect(Date.parse(order.createdAt)).toBe(Date.parse(seed.orders[i].createdAt))
      expect(order.paymentMethod).toBe(seed.orders[i].paymentMethod)
      expect(order.pricingWarnings).toEqual([])
    })
    expect(readState().seeded).toBe(true)
  })

  it('prices each seed order at its own createdAt (not now)', () => {
    seedOrders().forEach((order, i) => {
      const raw = seed.orders[i]
      const lines = raw.lines.map((line, n) => ({ id: `${raw.id}-${n + 1}`, config: line.options, quantity: line.qty }))
      const expected = priceCart(lines, menu, menu.promotions, Date.parse(raw.createdAt), raw.couponCode)
      expect(order.totals.payable).toBe(expected.payable)
      expect(order.coupon).toEqual(expected.coupon)
    })
  })

  it('a coupon entered after its time is kept as "expired_time"', () => {
    const late = seedOrders().filter((o) => o.coupon.entered !== null && o.coupon.status === 'expired_time')
    expect(late.length).toBeGreaterThan(0)
    for (const order of late) expect(order.coupon.applied).toBe(false)
  })

  it('is loaded only once, even after more requests and a checkout', () => {
    seedOrders()
    seedOrders()
    ok(addItem({ idempotencyKey: 'add-seed', config: configA(), quantity: 1 }))
    ok(checkout({ idempotencyKey: 'pay-seed', paymentMethod: 'card' }))

    const { orders } = ok(getOrders())
    expect(orders).toHaveLength(seed.orders.length + 1)
    expect(seedOrders()).toHaveLength(seed.orders.length)
  })

  it('does not reduce current stock (seed is history)', () => {
    seedOrders()
    const stock = ok(getStock())
    expect(stock.sold).toEqual({})
    for (const [ingredient, qty] of Object.entries(menu.stock)) {
      expect(stock.available[ingredient]).toBe(qty)
    }
  })

  it('an unknown option id does not crash: the order is kept with a pricing warning', () => {
    const known = seed.orders[0]
    const broken: SeedOrder = {
      ...known,
      id: 'BROKEN-1',
      lines: [{ qty: 1, options: { ...known.lines[0].options, 'no-such-option': 1 } }],
    }

    const order = priceSeedOrder(normalizeSeedOrder(broken))
    expect(order.id).toBe('BROKEN-1')
    expect(order.lines).toHaveLength(1)
    expect(order.lines[0].config).not.toHaveProperty('no-such-option')
    expect(order.pricingWarnings).toHaveLength(1)
    expect(order.pricingWarnings[0]).toContain('no-such-option')
  })
})
