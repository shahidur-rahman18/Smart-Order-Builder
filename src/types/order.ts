import type { Config, Poisha } from './menu'
import type { CouponResult, UnitBreakdown } from './pricing'

// Payment is only a label (SPEC Part E). No payment data is collected.
export const PAYMENT_METHODS = ['card', 'bkash', 'cash'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.some((method) => method === value)
}

// One line of a stored order, with its price frozen at pricedAt.
export interface StoredOrderLine {
  lineId: string
  quantity: number
  config: Config
  unit: UnitBreakdown
  lineTotal: Poisha
}

export interface StoredOrderTotals {
  subtotal: Poisha
  discount: { id: string; amount: Poisha } | null // the one cart discount that won
  discountedSubtotal: Poisha
  vat: Poisha
  payableExact: Poisha // before rounding to whole BDT
  payable: Poisha
}

// A stored order (D6). All money is integer poisha. Totals are stored, not
// re-computed later, so the record says what was actually charged.
export interface StoredOrder {
  id: string // server-generated (seed orders keep their seed id)
  source: 'seed' | 'checkout' // seed orders are history and do not reduce stock
  createdAt: string // ISO UTC, server time
  pricedAt: string // ISO UTC: the moment whose promotions were used
  paymentMethod: string // checkout accepts only PAYMENT_METHODS; seed keeps what the file says
  moneyUnit: 'poisha'
  currency: string
  lines: StoredOrderLine[]
  coupon: CouponResult // entered text + applied yes/no + status + reason
  totals: StoredOrderTotals
  pricingWarnings: string[] // e.g. a seed line with an option the menu does not know
}
