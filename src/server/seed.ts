import { menu, seed } from '../fixtures'
import { priceCart } from '../engine/pricing'
import type { CartLineInput, Config } from '../types/menu'
import type { StoredOrder } from '../types/order'
import type { SeedOrder } from '../types/seed'
import { buildStoredOrder } from './orders'
import type { ServerState } from './state'

// A seed order in our own words (the seed file says qty/options, we say quantity/config).
export interface NormalizedSeedOrder {
  id: string
  createdAtMs: number
  paymentMethod: string
  couponCode: string | null
  lines: CartLineInput[]
  warnings: string[]
}

// Adapter for the seed file's field names. Options the menu does not know are
// dropped with a warning, because priceUnit() cannot price them and we must not crash.
export function normalizeSeedOrder(raw: SeedOrder): NormalizedSeedOrder {
  const knownIds = new Set(menu.groups.flatMap((group) => group.options.map((option) => option.id)))
  const warnings: string[] = []

  const lines = raw.lines.map((line, i) => {
    const lineId = `${raw.id}-${i + 1}`
    const config: Config = {}
    for (const [optionId, qty] of Object.entries(line.options)) {
      if (knownIds.has(optionId)) {
        config[optionId] = qty
      } else {
        warnings.push(`Line ${lineId}: unknown option "${optionId}" was not priced`)
      }
    }
    return { id: lineId, config, quantity: line.qty }
  })

  return {
    id: raw.id,
    // The seed time has its own +06:00 offset, so Date.parse gives the exact moment.
    createdAtMs: Date.parse(raw.createdAt),
    paymentMethod: raw.paymentMethod,
    couponCode: raw.couponCode,
    lines,
    warnings,
  }
}

// Priced with the promotions that were valid at the order's own time, not now.
export function priceSeedOrder(order: NormalizedSeedOrder): StoredOrder {
  const breakdown = priceCart(order.lines, menu, menu.promotions, order.createdAtMs, order.couponCode)
  return buildStoredOrder({
    id: order.id,
    source: 'seed',
    pricedAtMs: order.createdAtMs,
    paymentMethod: order.paymentMethod,
    lines: order.lines,
    breakdown,
    pricingWarnings: order.warnings,
  })
}

// Runs once: the `seeded` flag is saved together with the orders.
export function loadSeedOnce(state: ServerState): void {
  if (state.seeded) return
  const seedOrders = seed.orders.map((raw) => priceSeedOrder(normalizeSeedOrder(raw)))
  state.orders = [...seedOrders, ...state.orders]
  state.seeded = true
}
