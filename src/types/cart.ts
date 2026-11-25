import type { Config, Poisha } from './menu'
import type { UnitBreakdown } from './pricing'

// A cart item IS its reservation. It holds stock while expiresAt > serverNow().
// All times are server time in ms.
export interface CartItem {
  id: string
  config: Config
  quantity: number
  createdAt: number
  expiresAt: number
  version: number // +1 on every edit
}

export interface Cart {
  version: number // +1 on every cart change
  couponCode: string | null
  items: CartItem[]
}

export type CartItemStatus = 'active' | 'expired'

// What the browser sees: the item plus its status and current price.
export interface CartItemView extends CartItem {
  status: CartItemStatus
  unit: UnitBreakdown
  lineTotal: Poisha
}

export interface CartView {
  version: number
  couponCode: string | null
  items: CartItemView[]
}
