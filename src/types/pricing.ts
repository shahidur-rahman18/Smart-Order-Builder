import type { Poisha } from './menu'

// Price of ONE item, step by step (SPEC Part C steps 1–3).
export interface UnitBreakdown {
  base: Poisha
  optionsTotal: Poisha
  step1: Poisha // base + optionsTotal
  cheapestFree: { freeUnits: number; discount: Poisha } // extras deal
  step2: Poisha // step1 − cheapestFree.discount
  combo: { applied: boolean; discount: Poisha } // combo percent
  unitPrice: Poisha // step2 − combo.discount
}

export interface CartLineBreakdown {
  id: string
  unit: UnitBreakdown
  quantity: number
  lineTotal: Poisha
}

// One possible cart discount and why it does or does not apply.
export interface DiscountCandidate {
  id: string
  amount: Poisha
  eligible: boolean
  reason: string
}

export type CouponStatus =
  | 'applied'
  | 'not_entered'
  | 'invalid_code'
  | 'expired_time'
  | 'lost_to_better_discount'

export interface CouponResult {
  entered: string | null
  applied: boolean
  status: CouponStatus
  reason: string
}

export interface CartBreakdown {
  lines: CartLineBreakdown[]
  subtotal: Poisha
  candidates: DiscountCandidate[]
  appliedDiscount: { id: string; amount: Poisha } | null
  coupon: CouponResult
  discountedSubtotal: Poisha
  vat: Poisha
  payableExact: Poisha // before rounding to whole BDT
  payable: Poisha // rounded half-up to whole BDT
}
