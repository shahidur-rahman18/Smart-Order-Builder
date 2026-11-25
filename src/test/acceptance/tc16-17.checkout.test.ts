import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { menu } from '../../fixtures'
import { addItem, getCart, setCoupon } from '../../server/cart'
import { checkout, getOrders } from '../../server/checkout'
import { ordersToJson } from '../../engine/ordersJson'
import { getStock } from '../../server/stockView'
import { STORAGE_KEY } from '../../server/storage'
import { configA, configB } from '../builders'
import { errorOf, ingredientId, ok } from '../serverHelpers'
import type { StoredOrder } from '../../types/order'

const EGG = ingredientId('egg')
const TTL_MS = menu.shop.reservationTtlSeconds * 1000
const SKEW_MS = 90_000

const checkoutOrders = (orders: StoredOrder[]) => orders.filter((o) => o.source === 'checkout')

describe('SPEC §9 checkout acceptance tests', () => {
  // Browser 10:00:00 Dhaka → server 10:01:30 Dhaka.
  const browserStart = Date.parse('2026-11-25T04:00:00.000Z')

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(browserStart)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('TC-16 Pay twice with the same key → 1 order, cart empty, sold counted once, expiry does not release sold', () => {
    const fullEggs = ok(getStock()).available[EGG]
    ok(addItem({ idempotencyKey: 'add-tc16', config: configB(), quantity: 1 }))
    const eggsWhileReserved = ok(getStock()).available[EGG]
    expect(eggsWhileReserved).toBeLessThan(fullEggs)

    const request = { idempotencyKey: 'pay-tc16', paymentMethod: 'card' } as const
    const first = checkout(request)
    const second = checkout(request)

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(ok(second).order.id).toBe(ok(first).order.id)
    expect(checkoutOrders(ok(getOrders()).orders)).toHaveLength(1)
    expect(ok(getCart()).cart.items).toHaveLength(0)

    // Reserved became sold: the same eggs are gone, not twice as many.
    const stock = ok(getStock())
    expect(stock.available[EGG]).toBe(eggsWhileReserved)
    expect(stock.reserved[EGG] ?? 0).toBe(0)

    // Long after the old reservation would have expired, sold stays sold.
    vi.setSystemTime(browserStart + TTL_MS * 3)
    expect(ok(getStock()).available[EGG]).toBe(eggsWhileReserved)

    // A second click with a NEW key finds an empty cart.
    const third = checkout({ idempotencyKey: 'pay-tc16-again', paymentMethod: 'card' })
    expect(third.status).toBe(409)
    expect(errorOf(third).code).toBe('CART_EMPTY')
    expect(checkoutOrders(ok(getOrders()).orders)).toHaveLength(1)
  })

  it('TC-17 refresh after checkout → orders still there; export is valid JSON in the D6 shape', () => {
    ok(addItem({ idempotencyKey: 'add-tc17', config: configA(), quantity: 2 }))
    const { order } = ok(checkout({ idempotencyKey: 'pay-tc17', paymentMethod: 'bkash' }))

    // "Refresh": nothing in memory survives, only localStorage. A new request reads it again.
    const saved = localStorage.getItem(STORAGE_KEY)
    localStorage.clear()
    localStorage.setItem(STORAGE_KEY, saved ?? '')
    const { orders } = ok(getOrders())
    expect(orders.find((o) => o.id === order.id)).toEqual(order)

    // Download orders.json
    const parsed: unknown = JSON.parse(ordersToJson(orders))
    expect(parsed).toEqual(orders)

    // D6 shape: same keys on every order, money as whole poisha.
    for (const stored of orders) {
      expect(Object.keys(stored).sort()).toEqual(
        [
          'coupon', 'createdAt', 'currency', 'id', 'lines', 'moneyUnit', 'paymentMethod',
          'pricedAt', 'pricingWarnings', 'source', 'totals',
        ].sort(),
      )
      expect(stored.moneyUnit).toBe('poisha')
      expect(stored.currency).toBe(menu.shop.currency)
      expect(Number.isInteger(stored.totals.payable)).toBe(true)
      expect(stored.createdAt).toBe(new Date(Date.parse(stored.createdAt)).toISOString())
    }
  })
})

describe('checkout details', () => {
  // Browser 10:58:29 Dhaka → server 10:59:59 Dhaka (the TC-06 moment).
  const browserAt105829 = Date.parse('2026-11-25T10:58:29+06:00')

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(browserAt105829)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('order id and createdAt come from the server; price is locked at Pay with server time', () => {
    ok(addItem({ idempotencyKey: 'add-1', config: configB(), quantity: 1 }))
    setCoupon('MORNING15')
    const { order } = ok(checkout({ idempotencyKey: 'pay-1', paymentMethod: 'cash' }))

    expect(order.source).toBe('checkout')
    expect(order.createdAt).toBe(new Date(browserAt105829 + SKEW_MS).toISOString())
    expect(order.pricedAt).toBe(order.createdAt)
    expect(order.paymentMethod).toBe('cash')
    expect(order.lines).toHaveLength(1)
    expect(order.lines[0].unit.unitPrice).toBe(67950)
    // Server time is 10:59:59, so the coupon still counts even though it was entered as text only.
    expect(order.coupon.entered).toBe('MORNING15')
    expect(order.coupon.applied).toBe(true)
    // The cart (and its coupon) is empty after Pay.
    expect(ok(getCart()).cart.couponCode).toBeNull()
  })

  it('a coupon entered but not applied is recorded with status and reason', () => {
    vi.setSystemTime(browserAt105829 + 1000) // server 11:00:00
    ok(addItem({ idempotencyKey: 'add-2', config: configA(), quantity: 1 }))
    setCoupon('MORNING15')
    const { order } = ok(checkout({ idempotencyKey: 'pay-2', paymentMethod: 'card' }))

    expect(order.coupon.entered).toBe('MORNING15')
    expect(order.coupon.applied).toBe(false)
    expect(order.coupon.status).toBe('expired_time')
    expect(order.coupon.reason).not.toBe('')
  })

  it('only active items are paid; an expired-only cart → 409 CART_EMPTY and nothing changes', () => {
    ok(addItem({ idempotencyKey: 'add-3', config: configA(), quantity: 1 }))
    vi.setSystemTime(browserAt105829 + TTL_MS)
    const before = localStorage.getItem(STORAGE_KEY)

    const result = checkout({ idempotencyKey: 'pay-3', paymentMethod: 'card' })
    expect(result.status).toBe(409)
    expect(errorOf(result).code).toBe('CART_EMPTY')
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
  })

  it('unknown payment method → 422, cart and orders unchanged', () => {
    ok(addItem({ idempotencyKey: 'add-4', config: configA(), quantity: 1 }))
    const before = localStorage.getItem(STORAGE_KEY)

    const result = checkout({ idempotencyKey: 'pay-4', paymentMethod: 'cheque' })
    expect(result.status).toBe(422)
    expect(errorOf(result).code).toBe('INVALID_PAYMENT_METHOD')
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
  })
})
