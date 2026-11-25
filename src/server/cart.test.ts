import { describe, expect, it } from 'vitest'
import { menu } from '../fixtures'
import { addItem, editItem, getCart, removeItem, setCoupon } from './cart'
import { getStock } from './stockView'
import { failNextReserve } from './chaos'
import { withState } from './state'
import { buildStoredOrder } from './orders'
import { priceCart } from '../engine/pricing'
import { formatShortages } from '../engine/stock'
import { configA, configB, configByNames, configC } from '../test/builders'
import { errorOf, ingredientId, ok } from '../test/serverHelpers'
import type { CartItemView } from '../types/cart'
import type { Config } from '../types/menu'

const EGG = ingredientId('egg')
const CHEESE = ingredientId('cheese')
const CROISSANT = ingredientId('croissant')

let keyCounter = 0
const newKey = () => `key-${++keyCounter}`

function add(config: Config, quantity = 1): CartItemView {
  return ok(addItem({ idempotencyKey: newKey(), config, quantity })).item
}

function edit(item: CartItemView, config: Config, quantity = item.quantity) {
  return editItem(item.id, { idempotencyKey: newKey(), config, quantity, itemVersion: item.version })
}

describe('TC-08…11 through the cart server (409 with shortages)', () => {
  it('TC-08 B x1 + C x2 held: egg 0, cheese 0, croissant 1; adding A → 409 "Short: 2 egg"', () => {
    add(configB(), 1)
    add(configC(), 2)

    const { available } = ok(getStock())
    expect(available[EGG]).toBe(0)
    expect(available[CHEESE]).toBe(0)
    expect(available[CROISSANT]).toBe(1)

    const blocked = addItem({ idempotencyKey: newKey(), config: configA(), quantity: 1 })
    expect(blocked.status).toBe(409)
    const error = errorOf(blocked)
    expect(error.code).toBe('OUT_OF_STOCK')
    expect(formatShortages(error.shortages ?? [])).toBe('Short: 2 egg')
    expect(error.available?.[EGG]).toBe(0)
    expect(ok(getCart()).cart.items).toHaveLength(2)
  })

  it('TC-09 edit B to Omelette x3 + Fried x1 → 409 "Short: 1 egg"; B unchanged', () => {
    const b = add(configB(), 1)
    add(configC(), 2)

    const result = edit(b, { ...configB(), ...configByNames({ Omelette: 3, Fried: 1 }) })
    expect(result.status).toBe(409)
    expect(formatShortages(errorOf(result).shortages ?? [])).toBe('Short: 1 egg')

    const saved = ok(getCart()).cart.items.find((i) => i.id === b.id)
    expect(saved?.config).toEqual(configB())
    expect(saved?.version).toBe(1)
  })

  it('TC-10 edit B to Omelette x1 + Fried x3 → 200, B = 643.50, egg remaining 1', () => {
    const b = add(configB(), 1)
    add(configC(), 2)

    const result = ok(edit(b, { ...configB(), ...configByNames({ Omelette: 1, Fried: 3 }) }))
    expect(result.item.unit.unitPrice).toBe(64350)
    expect(result.item.version).toBe(2)
    expect(result.item.expiresAt).toBe(b.expiresAt) // edit keeps the original expiry
    expect(ok(getStock()).available[EGG]).toBe(1)
  })

  it('TC-11 change C quantity 2 → 3 → 409 "Short: 2 egg, 2 cheese"', () => {
    add(configB(), 1)
    const c = add(configC(), 2)

    const result = edit(c, configC(), 3)
    expect(result.status).toBe(409)
    expect(formatShortages(errorOf(result).shortages ?? [])).toBe('Short: 2 egg, 2 cheese')
  })
})

describe('D1 — two tabs share one localStorage', () => {
  it('tab B takes the last eggs while tab A edits → A gets 409 with fresh available', () => {
    // Tab A: item A holds 2 eggs.
    const a = add(configA(), 1)
    // Tab B (another call, same localStorage): takes the other 8 eggs.
    add(configB(), 1)
    add(configByNames({ Toast: 1, Fried: 2, 'Chicken Sausage': 1 }), 1)
    expect(ok(getStock()).available[EGG]).toBe(0)

    // Tab A saves an edit that needs 4 eggs (2 more than it holds).
    const result = edit(a, { ...configA(), ...configByNames({ Scrambled: 4 }) })
    expect(result.status).toBe(409)
    const error = errorOf(result)
    expect(formatShortages(error.shortages ?? [])).toBe('Short: 2 egg')
    // "available" for an edit = what this item may use: its own 2 eggs, nothing more.
    expect(error.available?.[EGG]).toBe(2)
  })
})

describe('cart server details', () => {
  it('invalid config → 422 with every violation; nothing saved', () => {
    const result = addItem({ idempotencyKey: newKey(), config: configByNames({ Toast: 1 }), quantity: 1 })
    expect(result.status).toBe(422)
    const error = errorOf(result)
    expect(error.code).toBe('INVALID_CONFIG')
    expect(error.violations?.length).toBeGreaterThan(0)
    expect(ok(getCart()).cart.items).toHaveLength(0)
  })

  it('a quantity in a config must be a whole number ≥ 1', () => {
    const config = { ...configA(), ...configByNames({ Ketchup: 0.5 }) }
    const result = addItem({ idempotencyKey: newKey(), config, quantity: 1 })
    expect(result.status).toBe(422)
    expect(errorOf(result).code).toBe('INVALID_CONFIG')
  })

  it('item quantity outside 1…max → 422 INVALID_QUANTITY', () => {
    for (const quantity of [0, menu.shop.maxItemQuantity + 1, 1.5]) {
      const result = addItem({ idempotencyKey: newKey(), config: configA(), quantity })
      expect(result.status).toBe(422)
      expect(errorOf(result).code).toBe('INVALID_QUANTITY')
    }
  })

  it('edit of an unknown item → 404; with an old itemVersion → 409 VERSION_CONFLICT', () => {
    const a = add(configA())
    const missing = editItem('no-such-item', {
      idempotencyKey: newKey(), config: configA(), quantity: 1, itemVersion: 1,
    })
    expect(missing.status).toBe(404)

    ok(edit(a, configA(), 2)) // version 1 → 2
    const stale = edit(a, configA(), 1) // still sends version 1
    expect(stale.status).toBe(409)
    expect(errorOf(stale).code).toBe('VERSION_CONFLICT')
  })

  it('edit is atomic too: injected failure → item unchanged; retry same key → saved', () => {
    const a = add(configA())
    const request = { idempotencyKey: newKey(), config: configA(), quantity: 2, itemVersion: a.version }

    failNextReserve()
    expect(editItem(a.id, request).status).toBe(503)
    expect(ok(getCart()).cart.items[0].quantity).toBe(1)

    expect(editItem(a.id, request).status).toBe(200)
    expect(editItem(a.id, request).status).toBe(200) // replayed, not applied twice
    expect(ok(getCart()).cart.items[0]).toMatchObject({ quantity: 2, version: 2 })
  })

  it('remove releases the stock; removing again → 404', () => {
    const fullEggs = ok(getStock()).available[EGG]
    const b = add(configB())
    expect(ok(getStock()).available[EGG]).toBeLessThan(fullEggs)

    expect(removeItem(b.id).status).toBe(200)
    expect(ok(getStock()).available[EGG]).toBe(fullEggs)
    expect(removeItem(b.id).status).toBe(404)
  })

  it('coupon is stored on the cart and used by the totals; blank clears it', () => {
    add(configA())
    const withCoupon = ok(setCoupon('  some-code  '))
    expect(withCoupon.cart.couponCode).toBe('some-code')
    expect(withCoupon.totals.coupon.entered).toBe('some-code')

    expect(ok(setCoupon('   ')).cart.couponCode).toBeNull()
  })

  it('sold stock counts checkout orders only; seed orders are history', () => {
    const fullEggs = ok(getStock()).available[EGG]
    const lines = [{ id: 'line-1', config: configB(), quantity: 1 }] // 6 eggs
    const order = (id: string, source: 'seed' | 'checkout') => {
      const pricedAtMs = Date.parse('2026-11-25T03:00:00.000Z')
      const breakdown = priceCart(lines, menu, menu.promotions, pricedAtMs, null)
      return buildStoredOrder({ id, source, pricedAtMs, paymentMethod: 'card', lines, breakdown, pricingWarnings: [] })
    }
    withState((state) => {
      state.orders.push(order('seed-1', 'seed'))
      state.orders.push(order('live-1', 'checkout'))
    })

    const stock = ok(getStock())
    expect(stock.sold[EGG]).toBe(6)
    expect(stock.available[EGG]).toBe(fullEggs - 6)
  })
})
