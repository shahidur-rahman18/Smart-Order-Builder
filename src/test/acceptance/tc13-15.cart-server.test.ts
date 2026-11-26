import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { menu } from '../../fixtures'
import { addItem, editItem, getCart, removeItem } from '../../server/cart'
import { getStock } from '../../server/stockView'
import { failNextReserve } from '../../server/chaos'
import { STORAGE_KEY } from '../../server/storage'
import { configA, configB } from '../builders'
import { errorOf, ingredientId, ok } from '../serverHelpers'

const EGG = ingredientId('egg')
const TTL_MS = menu.shop.reservationTtlSeconds * 1000
const SKEW_MS = 90_000

describe('SPEC §9 cart server acceptance tests', () => {
  it('TC-13 same idempotency key sent 3 times → exactly 1 cart item', () => {
    const request = { idempotencyKey: 'key-tc13', config: configA(), quantity: 1 }

    const first = ok(addItem(request))
    const second = ok(addItem(request))
    const third = ok(addItem(request))

    expect(second.item.id).toBe(first.item.id)
    expect(third.item.id).toBe(first.item.id)
    expect(ok(getCart()).cart.items).toHaveLength(1)
  })

  it('TC-14 failure in the middle of reserve → state unchanged, no stock held; retry same key → success', () => {
    const before = localStorage.getItem(STORAGE_KEY)
    const fullEggs = ok(getStock()).available[EGG]
    const request = { idempotencyKey: 'key-tc14', config: configA(), quantity: 1 }

    failNextReserve()
    const failed = addItem(request)
    expect(failed.status).toBe(503)
    expect(errorOf(failed).code).toBe('RESERVE_FAILED')

    // Nothing was saved: no phantom item, no eggs held.
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
    expect(ok(getCart()).cart.items).toHaveLength(0)
    expect(ok(getStock()).available[EGG]).toBe(fullEggs)

    // Retry with the same key works, because failures are not remembered.
    const retried = addItem(request)
    expect(retried.status).toBe(201)
    expect(ok(getCart()).cart.items).toHaveLength(1)
  })

  describe('TC-15 expiry uses server time (+90 s skew)', () => {
    const browserStart = Date.parse('2026-11-25T04:00:00.000Z')

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(browserStart)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('expires at server createdAt + 300 s; stock released; edit → 410; still removable', () => {
      const fullEggs = ok(getStock()).available[EGG]
      const { item } = ok(addItem({ idempotencyKey: 'key-tc15', config: configB(), quantity: 1 }))

      // Stamped with SERVER time, not browser time.
      expect(item.createdAt).toBe(browserStart + SKEW_MS)
      expect(item.expiresAt).toBe(item.createdAt + TTL_MS)
      // Why the browser must use serverNow(): by its own clock 390 s seem left, not 300 s.
      expect(item.expiresAt - Date.now()).toBe(TTL_MS + SKEW_MS)

      // 1 ms before expiry: still active, eggs still held.
      vi.setSystemTime(browserStart + TTL_MS - 1)
      expect(ok(getCart()).cart.items[0].status).toBe('active')
      expect(ok(getStock()).available[EGG]).toBeLessThan(fullEggs)

      // Exactly at expiry: expired, eggs back, not counted in totals.
      vi.setSystemTime(browserStart + TTL_MS)
      const cart = ok(getCart())
      expect(cart.cart.items[0].status).toBe('expired')
      expect(cart.totals.lines).toHaveLength(0)
      expect(ok(getStock()).available[EGG]).toBe(fullEggs)

      const edit = editItem(item.id, {
        idempotencyKey: 'key-tc15-edit',
        config: configB(),
        quantity: 1,
        itemVersion: item.version,
      })
      expect(edit.status).toBe(410)
      expect(errorOf(edit).code).toBe('EXPIRED')

      expect(removeItem(item.id, item.version).status).toBe(200)
      expect(ok(getCart()).cart.items).toHaveLength(0)
    })
  })
})
