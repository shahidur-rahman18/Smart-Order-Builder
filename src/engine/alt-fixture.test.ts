// Proves the engines are data-driven: a different menu (burger, other ids,
// limits, promos, time zone) works with no code change.
import { describe, expect, it } from 'vitest'
import altJson from '../fixtures/menu.alt.json'
import { validate } from './validate'
import { priceCart, priceUnit } from './pricing'
import { availableStock, formatShortages, optionHeadroom, shortagesFor, usageOf } from './stock'
import type { Config, Menu } from '../types/menu'

const alt: Menu = altJson as Menu

function byNames(names: Record<string, number>): Config {
  const config: Config = {}
  for (const [name, qty] of Object.entries(names)) {
    const option = alt.groups.flatMap((g) => g.options).find((o) => o.name === name)
    if (!option) throw new Error(`Unknown option name: ${name}`)
    config[option.id] = qty
  }
  return config
}

const idOf = (name: string) => Object.keys(byNames({ [name]: 1 }))[0]

// Plain Bun, Beef Patty x2, Lettuce, Cheddar.
const doubleBeef = byNames({ 'Plain Bun': 1, 'Beef Patty': 2, Lettuce: 1, Cheddar: 1 })

describe('alt fixture: validate', () => {
  it('a normal burger is valid', () => {
    expect(validate(doubleBeef, alt.groups, alt.rules)).toEqual([])
  })

  it('override limit and requires rules from the alt menu are applied', () => {
    const config = byNames({ Brioche: 1, 'Chickpea Patty': 1, Lettuce: 1, Cheddar: 1, Pickles: 1 })
    const kinds = validate(config, alt.groups, alt.rules).map((v) => v.kind).sort()
    expect(kinds).toEqual(['max', 'requires'])
  })
})

describe('alt fixture: pricing', () => {
  it('unit: 580.00 → 1 topping free (10.00) → combo 20% → 456.00', () => {
    const unit = priceUnit(doubleBeef, alt)
    expect(unit.step1).toBe(58000)
    expect(unit.cheapestFree.discount).toBe(1000)
    expect(unit.combo.discount).toBe(11400)
    expect(unit.unitPrice).toBe(45600)
  })

  it('cart before 14:00 London: coupon capped at 30.00, VAT 10%, payable 469', () => {
    const lines = [{ id: 'l1', config: doubleBeef, quantity: 1 }]
    const result = priceCart(lines, alt, alt.promotions, Date.parse('2026-11-25T13:59:59Z'), 'lunch10')
    expect(result.appliedDiscount).toEqual({ id: 'Q1', amount: 3000 })
    expect(result.vat).toBe(4260)
    expect(result.payable).toBe(46900)
  })

  it('cart at 14:00 London: coupon expired, no cart discount, payable 502', () => {
    const lines = [{ id: 'l1', config: doubleBeef, quantity: 1 }]
    const result = priceCart(lines, alt, alt.promotions, Date.parse('2026-11-25T14:00:00Z'), 'LUNCH10')
    expect(result.coupon.status).toBe('expired_time')
    expect(result.appliedDiscount).toBeNull()
    expect(result.payable).toBe(50200)
  })
})

describe('alt fixture: stock', () => {
  it('lists every shortage in alt ingredient order', () => {
    const shortages = shortagesFor(usageOf(doubleBeef, alt, 3), availableStock(alt, [], []), alt)
    expect(formatShortages(shortages)).toBe('Short: 2 patty, 1 cheddar')
  })

  it('headroom uses alt stock; options with no ingredients are unlimited', () => {
    const headroom = optionHeadroom(alt, availableStock(alt, [], []), doubleBeef, 1)
    // Stock 4 patties, the draft already uses 2 → 2 more Beef Patty fit.
    expect(headroom[idOf('Beef Patty')]).toBe(2)
    expect(headroom[idOf('Pickles')]).toBe('unlimited')
  })
})
