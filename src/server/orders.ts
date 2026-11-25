import { menu } from '../fixtures'
import type { CartLineInput } from '../types/menu'
import type { StoredOrder } from '../types/order'
import type { CartBreakdown } from '../types/pricing'

export interface NewOrder {
  id: string
  source: StoredOrder['source']
  pricedAtMs: number // server time used for pricing; also the order time
  paymentMethod: string
  lines: CartLineInput[] // what was bought
  breakdown: CartBreakdown // priceCart() result for exactly these lines
  pricingWarnings: string[]
}

// Turns a priceCart() result into the record we keep (D6 shape).
// Like a shop receipt: what was bought, at what price, which discount, VAT, payable.
export function buildStoredOrder(input: NewOrder): StoredOrder {
  const { breakdown } = input
  const at = new Date(input.pricedAtMs).toISOString()
  return {
    id: input.id,
    source: input.source,
    createdAt: at,
    pricedAt: at,
    paymentMethod: input.paymentMethod,
    moneyUnit: 'poisha',
    currency: menu.shop.currency,
    lines: input.lines.map((line, i) => ({
      lineId: line.id,
      quantity: line.quantity,
      config: line.config,
      unit: breakdown.lines[i].unit,
      lineTotal: breakdown.lines[i].lineTotal,
    })),
    coupon: breakdown.coupon,
    totals: {
      subtotal: breakdown.subtotal,
      discount: breakdown.appliedDiscount,
      discountedSubtotal: breakdown.discountedSubtotal,
      vat: breakdown.vat,
      payableExact: breakdown.payableExact,
      payable: breakdown.payable,
    },
    pricingWarnings: input.pricingWarnings,
  }
}
