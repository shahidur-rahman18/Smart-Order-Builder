import type { ItemBody, OrderBody } from '../types/api'
import type { Cart } from '../types/cart'
import type { StoredOrder } from '../types/order'
import { loadSeedOnce } from './seed'
import { loadState, saveState } from './storage'

// A saved success response, so a repeated request gets the same answer.
// `op` keeps keys of different operations apart.
export type SavedResponse =
  | { op: 'add-item'; status: number; body: ItemBody }
  | { op: 'edit-item'; status: number; body: ItemBody }
  | { op: 'checkout'; status: number; body: OrderBody }

export type IdempotencyEntry = SavedResponse & { savedAt: number }

// Everything the mock server remembers, in localStorage "sob:v1".
// No stock counters on purpose: stock is always computed (stockView.ts).
export interface ServerState {
  schemaVersion: 1
  seeded: boolean
  cart: Cart
  orders: StoredOrder[] // seed + checkout
  idempotency: Record<string, IdempotencyEntry>
}

export function initialState(): ServerState {
  return {
    schemaVersion: 1,
    seeded: false,
    cart: { version: 0, couponCode: null, items: [] },
    orders: [],
    idempotency: {},
  }
}

// Every request starts here. If the seed is not stored yet, it is added to this
// copy only. A GET never writes, so the seed is saved (with seeded = true) by the
// first successful mutation. Seeding is deterministic, so every GET before that
// sees exactly the same seed orders.
export function readState(): ServerState {
  const state = loadState() ?? initialState()
  loadSeedOnce(state)
  return state
}

// Every mutation runs inside this: load → work on the copy → save once.
// If `work` throws (bad input, out of stock, injected failure), saveState()
// is never reached, so localStorage stays exactly as it was. That is the atomicity.
export function withState<T>(work: (state: ServerState) => T): T {
  const state = readState()
  const result = work(state)
  saveState(state)
  return result
}
