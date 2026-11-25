import { describe, expect, it } from 'vitest'
import { menu } from '../fixtures'
import { priceUnit } from '../engine/pricing'
import { configA, configByNames } from '../test/builders'
import { errorOf, ok } from '../test/serverHelpers'
import { chaos } from './chaos'
import { getMenu } from './menu'
import { pricePreview } from './price'

const SKEW_MS = 90_000

describe('GET /api/menu (server function)', () => {
  it('returns the fixture menu and server time', () => {
    const body = ok(getMenu())
    expect(body.menu).toEqual(menu)
    expect(body.serverTime - Date.now()).toBeGreaterThanOrEqual(SKEW_MS - 1000)
  })
})

describe('POST /api/price (server function)', () => {
  it('prices one unit with the engine and multiplies by quantity', () => {
    const body = ok(pricePreview({ requestId: 'r1', config: configA(), quantity: 2 }))
    const unit = priceUnit(configA(), menu)

    expect(body.requestId).toBe('r1')
    expect(body.breakdown).toEqual(unit)
    expect(body.lineTotal).toBe(unit.unitPrice * 2)
    expect(body.violations).toEqual([])
  })

  it('still prices an unfinished config and lists its violations', () => {
    // Only a sauce: required groups are missing, but the price so far can be shown.
    const config = configByNames({ Ketchup: 1 })
    const body = ok(pricePreview({ requestId: 'r2', config, quantity: 1 }))

    expect(body.violations.length).toBeGreaterThan(0)
    expect(body.breakdown).toEqual(priceUnit(config, menu))
  })

  it('an unknown option id gives no price, only the violation', () => {
    const body = ok(pricePreview({ requestId: 'r3', config: { 'not-on-menu': 1 }, quantity: 1 }))

    expect(body.breakdown).toBeNull()
    expect(body.lineTotal).toBeNull()
    expect(body.violations.map((v) => v.kind)).toContain('unknown')
  })

  it('rejects a quantity outside 1…max', () => {
    const response = pricePreview({ requestId: 'r4', config: configA(), quantity: menu.shop.maxItemQuantity + 1 })
    expect(response.status).toBe(422)
    expect(errorOf(response).code).toBe('INVALID_QUANTITY')
  })

  it('chaos: fails with 503 PRICE_UNAVAILABLE when the random roll is under the fail rate', () => {
    chaos.priceFailRate = 0.15
    chaos.random = () => 0.1
    const failed = pricePreview({ requestId: 'r5', config: configA(), quantity: 1 })
    expect(failed.status).toBe(503)
    expect(errorOf(failed).code).toBe('PRICE_UNAVAILABLE')

    chaos.random = () => 0.2
    expect(pricePreview({ requestId: 'r5', config: configA(), quantity: 1 }).status).toBe(200)
  })
})
