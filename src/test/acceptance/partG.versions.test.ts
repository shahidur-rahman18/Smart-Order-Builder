import { describe, expect, it } from 'vitest'
import { addItem, editItem, getCart, removeItem, setCoupon } from '../../server/cart'
import { checkout, getOrders } from '../../server/checkout'
import { getStock } from '../../server/stockView'
import { configA, configB } from '../builders'
import { errorOf, ok } from '../serverHelpers'

// Part G: two tabs share one cart. Each change says which version it saw.
// A tab that saw an old version gets 409 VERSION_CONFLICT and nothing is saved.

const cartVersion = () => ok(getCart()).cart.version

describe('Part G: cart versions (server)', () => {
  it('coupon with an old cartVersion → 409, coupon unchanged', () => {
    ok(addItem({ idempotencyKey: 'g-add-1', config: configA(), quantity: 1 }))
    const seenByTabB = cartVersion()
    ok(setCoupon('FIRST', seenByTabB)) // tab A changes the cart first

    const stale = setCoupon('SECOND', seenByTabB) // tab B still has the old version
    expect(stale.status).toBe(409)
    expect(errorOf(stale).code).toBe('VERSION_CONFLICT')
    expect(ok(getCart()).cart.couponCode).toBe('FIRST')
  })

  it('checkout with an old cartVersion → 409, no order, items still held', () => {
    ok(addItem({ idempotencyKey: 'g-add-2', config: configA(), quantity: 1 }))
    const seenByTabB = cartVersion()
    ok(addItem({ idempotencyKey: 'g-add-3', config: configB(), quantity: 1 })) // tab A adds B
    const ordersBefore = ok(getOrders()).orders.length
    const reservedBefore = ok(getStock()).reserved

    const stale = checkout({ idempotencyKey: 'g-pay-1', paymentMethod: 'cash', cartVersion: seenByTabB })
    expect(stale.status).toBe(409)
    expect(errorOf(stale).code).toBe('VERSION_CONFLICT')
    expect(ok(getOrders()).orders).toHaveLength(ordersBefore)
    expect(ok(getCart()).cart.items).toHaveLength(2)
    expect(ok(getStock()).reserved).toEqual(reservedBefore)

    // After a reload (fresh version) the same tab can pay.
    expect(checkout({ idempotencyKey: 'g-pay-2', paymentMethod: 'cash', cartVersion: cartVersion() }).status).toBe(201)
  })

  it('a double click on Pay is still one order (same key replays, even though the version moved)', () => {
    ok(addItem({ idempotencyKey: 'g-add-4', config: configA(), quantity: 1 }))
    const request = { idempotencyKey: 'g-pay-3', paymentMethod: 'card', cartVersion: cartVersion() }
    const first = checkout(request)
    const second = checkout(request)
    expect(second.status).toBe(201)
    expect(ok(second).order.id).toBe(ok(first).order.id)
  })

  it('remove with an old itemVersion → 409, item kept; with the current one → removed', () => {
    const item = ok(addItem({ idempotencyKey: 'g-add-5', config: configA(), quantity: 1 })).item
    // Tab A edits the item: version 1 → 2.
    ok(editItem(item.id, { idempotencyKey: 'g-edit-1', config: configA(), quantity: 2, itemVersion: item.version }))

    const stale = removeItem(item.id, item.version) // tab B still shows version 1
    expect(stale.status).toBe(409)
    expect(errorOf(stale).code).toBe('VERSION_CONFLICT')
    expect(ok(getCart()).cart.items).toHaveLength(1)

    expect(removeItem(item.id, item.version + 1).status).toBe(200)
    expect(ok(getCart()).cart.items).toHaveLength(0)
  })

  it('adding an item needs no version: it never overwrites anything', () => {
    ok(addItem({ idempotencyKey: 'g-add-6', config: configA(), quantity: 1 }))
    ok(addItem({ idempotencyKey: 'g-add-7', config: configA(), quantity: 1 }))
    expect(ok(getCart()).cart.items).toHaveLength(2)
  })
})
