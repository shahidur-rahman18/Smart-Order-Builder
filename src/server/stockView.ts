import { menu } from '../fixtures'
import { availableStock, sumUsage, usageOf, type StockLine, type Usage } from '../engine/stock'
import type { StockBody, ServerResponse } from '../types/api'
import type { CartItem } from '../types/cart'
import { serverNow } from './clock'
import { readState, type ServerState } from './state'

// A reservation holds stock only while it has not expired.
export function isActive(item: CartItem, now: number): boolean {
  return item.expiresAt > now
}

export function activeItems(state: ServerState, now: number): CartItem[] {
  return state.cart.items.filter((item) => isActive(item, now))
}

// Lines of live orders only. Seed orders are history and do not reduce stock.
export function soldLines(state: ServerState): StockLine[] {
  return state.orders.filter((order) => order.source === 'checkout').flatMap((order) => order.lines)
}

// available = fixture stock − sold − reserved, computed fresh on every call.
export function availableNow(state: ServerState, now: number): Usage {
  return availableStock(menu, soldLines(state), activeItems(state, now))
}

function totalUsage(lines: StockLine[]): Usage {
  return lines.reduce<Usage>((sum, line) => sumUsage(sum, usageOf(line.config, menu, line.quantity)), {})
}

// GET /api/stock
export function getStock(): ServerResponse<StockBody> {
  const state = readState()
  const now = serverNow()
  return {
    status: 200,
    body: {
      stock: menu.stock,
      sold: totalUsage(soldLines(state)),
      reserved: totalUsage(activeItems(state, now)),
      available: availableNow(state, now),
      serverTime: now,
    },
  }
}
