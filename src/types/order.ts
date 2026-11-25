import type { Config } from './menu'

// Step 6 needs only what stock needs (which lines were sold).
// Step 7 adds prices, coupon and totals here, as the user decides in D6.
export interface StoredOrderLine {
  config: Config
  quantity: number
}

export interface StoredOrder {
  id: string
  source: 'seed' | 'checkout' // seed orders are history and do not reduce stock
  createdAt: string // ISO, server time
  lines: StoredOrderLine[]
}
