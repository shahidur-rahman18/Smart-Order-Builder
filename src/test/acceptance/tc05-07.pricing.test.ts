import { describe, expect, it } from 'vitest'
import { menu } from '../../fixtures'
import { priceCart, priceUnit } from '../../engine/pricing'
import { configA, configB, configC } from '../builders'
import type { CartLineInput } from '../../types/menu'

const at = (iso: string) => Date.parse(iso)

const cartB1C2: CartLineInput[] = [
  { id: 'line-b', config: configB(), quantity: 1 },
  { id: 'line-c', config: configC(), quantity: 2 },
]

describe('SPEC §9 pricing acceptance tests', () => {
  it('TC-05 unit prices: A = 380.00, B = 679.50, C = 490.00', () => {
    expect(priceUnit(configA(), menu).unitPrice).toBe(38000)
    expect(priceUnit(configB(), menu).unitPrice).toBe(67950)
    expect(priceUnit(configC(), menu).unitPrice).toBe(49000)
  })

  it('TC-06 B x1 + C x2 at 10:59:59: subtotal 1,659.50, C2 150.00 wins, VAT 75.48, payable 1,585', () => {
    const result = priceCart(cartB1C2, menu, menu.promotions, at('2026-11-25T10:59:59+06:00'), 'MORNING15')
    expect(result.subtotal).toBe(165950)
    expect(result.appliedDiscount).toEqual({ id: 'C2', amount: 15000 })
    expect(result.coupon.status).toBe('applied')
    expect(result.discountedSubtotal).toBe(150950)
    expect(result.vat).toBe(7548)
    expect(result.payableExact).toBe(158498)
    expect(result.payable).toBe(158500)
  })

  it('TC-07 same cart at 11:00:00 with coupon: rejected, C1 100.00, VAT 77.98, payable 1,637', () => {
    const result = priceCart(cartB1C2, menu, menu.promotions, at('2026-11-25T11:00:00+06:00'), 'MORNING15')
    expect(result.subtotal).toBe(165950)
    expect(result.coupon.applied).toBe(false)
    expect(result.coupon.status).toBe('expired_time')
    expect(result.appliedDiscount).toEqual({ id: 'C1', amount: 10000 })
    expect(result.discountedSubtotal).toBe(155950)
    expect(result.vat).toBe(7798)
    expect(result.payable).toBe(163700)
  })
})
