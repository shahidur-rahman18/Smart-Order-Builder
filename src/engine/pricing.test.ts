import { describe, expect, it } from 'vitest'
import { menu } from '../fixtures'
import { priceCart, priceUnit } from './pricing'
import { configA, configB, configByNames } from '../test/builders'
import type { CartLineInput, Config, Promotion } from '../types/menu'

const morning = Date.parse('2026-11-25T10:30:00+06:00')
const lateMorning = Date.parse('2026-11-25T11:30:00+06:00')

// Toast + Fried x2 + Tofu = 250 + 60 + 50 = 360.00 BDT, no promos.
const plain = { Toast: 1, Fried: 2, Tofu: 1 }

function line(config: Config, quantity = 1): CartLineInput {
  return { id: crypto.randomUUID(), config, quantity }
}

describe('priceUnit: step 1 (base + options)', () => {
  it('B before discounts: base 250 + options 505 = 755.00', () => {
    const unit = priceUnit(configB(), menu)
    expect(unit.base).toBe(25000)
    expect(unit.optionsTotal).toBe(50500)
    expect(unit.step1).toBe(75500)
  })

  it('B: combo takes 10% of 755.00 = 75.50 → 679.50', () => {
    const unit = priceUnit(configB(), menu)
    expect(unit.combo).toEqual({ applied: true, discount: 7550 })
    expect(unit.unitPrice).toBe(67950)
  })
})

describe('priceUnit: extras deal (cheapest of every 3 extra units is free)', () => {
  it('2 extras → nothing free', () => {
    const unit = priceUnit(configByNames({ ...plain, 'Hash Brown': 1, Mushroom: 1 }), menu)
    expect(unit.cheapestFree).toEqual({ freeUnits: 0, discount: 0 })
  })

  it('3 extras → cheapest (Baked Beans 25.00) free', () => {
    const unit = priceUnit(configByNames({ ...plain, 'Hash Brown': 1, Mushroom: 1, 'Baked Beans': 1 }), menu)
    expect(unit.cheapestFree).toEqual({ freeUnits: 1, discount: 2500 })
  })

  it('4 extras → still only 1 free (floor(4/3) = 1)', () => {
    const unit = priceUnit(
      configByNames({ ...plain, 'Hash Brown': 1, Mushroom: 1, 'Baked Beans': 1, Cheese: 1 }),
      menu,
    )
    expect(unit.cheapestFree).toEqual({ freeUnits: 1, discount: 2500 })
  })

  it('6 extra units → 2 cheapest units free, a repeated option counts per unit (25.00 + 30.00)', () => {
    // 6 extras breaks the group max, but pricing does not validate: it just prices what it gets.
    const unit = priceUnit(
      configByNames({ ...plain, 'Hash Brown': 2, Mushroom: 2, 'Baked Beans': 1, Cheese: 1 }),
      menu,
    )
    expect(unit.cheapestFree).toEqual({ freeUnits: 2, discount: 5500 })
  })
})

describe('priceUnit: combo boundary (eggs >= 4 units AND protein >= 2)', () => {
  const twoProteins = { Toast: 1, 'Chicken Sausage': 2 }

  it('3 egg units → no combo, even though Omelette uses 2 eggs (Omelette counts as 1 unit)', () => {
    const unit = priceUnit(configByNames({ ...twoProteins, Fried: 2, Omelette: 1 }), menu)
    expect(unit.combo.applied).toBe(false)
    expect(unit.combo.discount).toBe(0)
  })

  it('4 egg units + 2 protein → combo applies', () => {
    const unit = priceUnit(configByNames({ ...twoProteins, Fried: 4 }), menu)
    // 250 + 120 + 120 = 490.00 → 10% = 49.00 → 441.00
    expect(unit.combo).toEqual({ applied: true, discount: 4900 })
    expect(unit.unitPrice).toBe(44100)
  })

  it('4 egg units but only 1 protein → no combo', () => {
    const unit = priceUnit(configByNames({ Toast: 1, Fried: 4, 'Chicken Sausage': 1 }), menu)
    expect(unit.combo.applied).toBe(false)
  })
})

describe('priceCart: cart discount and coupon', () => {
  it('no coupon entered → status not_entered, C1 applies on a big cart', () => {
    const result = priceCart([line(configB(), 2)], menu, menu.promotions, morning, null)
    expect(result.coupon.status).toBe('not_entered')
    expect(result.appliedDiscount).toEqual({ id: 'C1', amount: 10000 })
  })

  it('wrong code → invalid_code, no coupon discount', () => {
    const result = priceCart([line(configB(), 2)], menu, menu.promotions, morning, 'EVENING15')
    expect(result.coupon.status).toBe('invalid_code')
    expect(result.coupon.applied).toBe(false)
    expect(result.appliedDiscount?.id).toBe('C1')
  })

  it('lowercase code with spaces still works', () => {
    const result = priceCart([line(configB(), 2)], menu, menu.promotions, morning, '  morning15 ')
    expect(result.coupon.status).toBe('applied')
    expect(result.appliedDiscount).toEqual({ id: 'C2', amount: 15000 })
  })

  it('tie between C1 and C2 → C1 wins, coupon is lost_to_better_discount', () => {
    // Real fixture can never tie (C2 hits its 150 cap first), so lower the cap to 100.00.
    const promos: Promotion[] = menu.promotions.map((p) =>
      p.type === 'couponPercent' ? { ...p, cap: 10000 } : p,
    )
    const result = priceCart([line(configB(), 2)], menu, promos, morning, 'MORNING15')
    expect(result.appliedDiscount).toEqual({ id: 'C1', amount: 10000 })
    expect(result.coupon.status).toBe('lost_to_better_discount')
  })

  it('lists every candidate with eligible + reason', () => {
    const result = priceCart([line(configA())], menu, menu.promotions, morning, null)
    expect(result.candidates.map((c) => [c.id, c.eligible])).toEqual([
      ['C1', false],
      ['C2', false],
    ])
    for (const c of result.candidates) expect(c.reason.length).toBeGreaterThan(0)
  })

  it('empty cart → everything 0', () => {
    const result = priceCart([], menu, menu.promotions, morning, null)
    expect(result.subtotal).toBe(0)
    expect(result.appliedDiscount).toBeNull()
    expect(result.payable).toBe(0)
  })
})

describe('hand checks for ANSWERS.md', () => {
  it('Q2 cheapest valid configuration (Toast, Fried x2, Tofu) = 360.00', () => {
    expect(priceUnit(configByNames(plain), menu).unitPrice).toBe(36000)
  })

  it('Q3 A x3 at 10:30 with coupon → C2 150.00, VAT 49.50, payable 1,040', () => {
    const result = priceCart([line(configA(), 3)], menu, menu.promotions, morning, 'MORNING15')
    expect(result.subtotal).toBe(114000)
    expect(result.appliedDiscount).toEqual({ id: 'C2', amount: 15000 })
    expect(result.vat).toBe(4950)
    expect(result.payable).toBe(104000)
  })

  it('Q3 A x3 at 11:30 with coupon → no discount, VAT 57.00, payable 1,197', () => {
    const result = priceCart([line(configA(), 3)], menu, menu.promotions, lateMorning, 'MORNING15')
    expect(result.subtotal).toBe(114000)
    expect(result.appliedDiscount).toBeNull()
    expect(result.vat).toBe(5700)
    expect(result.payable).toBe(119700)
  })
})
