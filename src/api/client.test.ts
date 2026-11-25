import { describe, expect, it } from 'vitest'
import { menu } from '../fixtures'
import { failNextReserve } from '../server/chaos'
import { configA } from '../test/builders'
import { ApiError, api } from './client'
import { clockOffset, serverNow } from './serverClock'

const SKEW_MS = 90_000

// Runs a call that must fail and returns its ApiError.
async function apiErrorOf(call: Promise<unknown>): Promise<ApiError> {
  try {
    await call
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('Expected an ApiError, but the call succeeded')
}

describe('api client (through MSW)', () => {
  it('GET /api/menu → the fixture menu', async () => {
    const body = await api.getMenu()
    expect(body.menu).toEqual(menu)
  })

  it('learns the server clock offset (≈ +90 s) from a response', async () => {
    await api.getMenu()
    expect(clockOffset()).toBeGreaterThan(SKEW_MS - 1000)
    expect(clockOffset()).toBeLessThan(SKEW_MS + 1000)
    expect(Math.abs(serverNow() - (Date.now() + SKEW_MS))).toBeLessThan(1000)
  })

  it('GET /api/stock → available for every ingredient', async () => {
    const body = await api.getStock()
    expect(Object.keys(body.available).sort()).toEqual(Object.keys(menu.stock).sort())
  })

  it('POST /api/price → echoes requestId with a breakdown', async () => {
    const body = await api.price({ requestId: 'p1', config: configA(), quantity: 1 })
    expect(body.requestId).toBe('p1')
    expect(body.breakdown?.unitPrice).toBeGreaterThan(0)
  })

  it('cart round trip: add → edit → coupon → get → remove', async () => {
    const added = await api.addItem({ idempotencyKey: 'k1', config: configA(), quantity: 1 })
    expect(added.cart.items).toHaveLength(1)

    const edited = await api.editItem(added.item.id, {
      idempotencyKey: 'k2',
      config: configA(),
      quantity: 2,
      itemVersion: added.item.version,
    })
    expect(edited.item.quantity).toBe(2)

    const withCoupon = await api.setCoupon('anything')
    expect(withCoupon.cart.couponCode).toBe('anything')

    const cart = await api.getCart()
    expect(cart.totals.lines).toHaveLength(1)

    const removed = await api.removeItem(added.item.id)
    expect(removed.cart.items).toHaveLength(0)
  })

  it('checkout → one order, then it is in GET /api/orders', async () => {
    await api.addItem({ idempotencyKey: 'k3', config: configA(), quantity: 1 })
    const before = await api.getOrders()

    const { order } = await api.checkout({ idempotencyKey: 'k4', paymentMethod: 'cash' })
    expect(order.source).toBe('checkout')

    const after = await api.getOrders()
    expect(after.orders).toHaveLength(before.orders.length + 1)
    expect(after.orders.map((o) => o.id)).toContain(order.id)
  })

  it('an error response becomes ApiError { status, code, body }', async () => {
    failNextReserve()
    const error = await apiErrorOf(api.addItem({ idempotencyKey: 'k5', config: configA(), quantity: 1 }))
    expect(error.status).toBe(503)
    expect(error.code).toBe('RESERVE_FAILED')
    expect(error.body?.message).toBeTruthy()
  })

  it('404 for an unknown cart item', async () => {
    const error = await apiErrorOf(api.removeItem('no-such-item'))
    expect(error.status).toBe(404)
    expect(error.code).toBe('NOT_FOUND')
  })

  it('a malformed body → 400 BAD_REQUEST, not a crash', async () => {
    const response = await fetch(new URL('/api/cart/items', window.location.href), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: 'nope' }),
    })
    expect(response.status).toBe(400)
  })
})
