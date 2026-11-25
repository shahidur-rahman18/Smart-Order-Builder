import { menu } from '../fixtures'
import { validate } from '../engine/validate'
import { availableForEdit, formatShortages, shortagesFor, usageOf, type Usage } from '../engine/stock'
import { priceCart, priceUnit } from '../engine/pricing'
import type {
  AddItemRequest,
  CartBody,
  EditItemRequest,
  ErrorBody,
  ItemBody,
  RemoveItemBody,
  ServerResponse,
} from '../types/api'
import type { CartItem, CartItemView, CartView } from '../types/cart'
import type { Config } from '../types/menu'
import type { CartBreakdown } from '../types/pricing'
import { takeReserveFailure } from './chaos'
import { serverNow } from './clock'
import { ServerError, respond } from './http'
import { recall, remember } from './idempotency'
import { readState, withState, type SavedResponse, type ServerState } from './state'
import { activeItems, availableNow, isActive } from './stockView'

// ---------- requests ----------

// POST /api/cart/items — add an item and reserve its stock for the TTL.
export function addItem(request: AddItemRequest): ServerResponse<ItemBody | ErrorBody> {
  return respond(() =>
    withState((state) => {
      const now = serverNow()
      const saved = recall(state, 'add-item', request.idempotencyKey)
      if (saved) return replay(saved, now)

      const { config, quantity } = request
      checkQuantity(quantity)
      checkConfig(config)
      checkStock(usageOf(config, menu, quantity), availableNow(state, now))

      const item: CartItem = {
        id: crypto.randomUUID(),
        config,
        quantity,
        createdAt: now,
        expiresAt: now + menu.shop.reservationTtlSeconds * 1000,
        version: 1,
      }
      state.cart.items.push(item)
      state.cart.version += 1
      // The item is already in our copy. A failure here proves a half-done
      // reserve is never saved (TC-14).
      failIfChaos()

      const response = { status: 201, body: itemBody(state, item, now) }
      remember(state, request.idempotencyKey, { op: 'add-item', ...response }, now)
      return response
    }),
  )
}

// PUT /api/cart/items/:id — change config/quantity in ONE atomic step.
export function editItem(itemId: string, request: EditItemRequest): ServerResponse<ItemBody | ErrorBody> {
  return respond(() =>
    withState((state) => {
      const now = serverNow()
      const saved = recall(state, 'edit-item', request.idempotencyKey)
      if (saved) return replay(saved, now)

      const item = findItem(state, itemId)
      if (!isActive(item, now)) {
        throw new ServerError(410, {
          code: 'EXPIRED',
          message: 'This item expired and its stock was released. Add it again as a new item.',
        })
      }
      if (item.version !== request.itemVersion) {
        throw new ServerError(409, {
          code: 'VERSION_CONFLICT',
          message: 'This item was changed somewhere else. Reload the cart and try again.',
        })
      }

      const { config, quantity } = request
      checkQuantity(quantity)
      checkConfig(config)
      // Net difference: the stock this item already holds counts as available to it.
      // availableNow() still includes the item as reserved, so we add back exactly its own share.
      checkStock(usageOf(config, menu, quantity), availableForEdit(availableNow(state, now), item, menu))

      item.config = config
      item.quantity = quantity
      item.version += 1
      state.cart.version += 1
      // expiresAt stays the same: an edit does not renew the reservation.
      failIfChaos()

      const response = { status: 200, body: itemBody(state, item, now) }
      remember(state, request.idempotencyKey, { op: 'edit-item', ...response }, now)
      return response
    }),
  )
}

// DELETE /api/cart/items/:id — works for expired items too.
export function removeItem(itemId: string): ServerResponse<RemoveItemBody | ErrorBody> {
  return respond(() =>
    withState((state) => {
      const now = serverNow()
      const item = findItem(state, itemId)
      state.cart.items = state.cart.items.filter((other) => other.id !== item.id)
      state.cart.version += 1
      return { status: 200, body: { cart: cartView(state, now), serverTime: now } }
    }),
  )
}

// PUT /api/cart/coupon — store what was typed; priceCart decides if it applies.
export function setCoupon(code: string | null): ServerResponse<CartBody> {
  return withState((state) => {
    const now = serverNow()
    const trimmed = code?.trim() ?? ''
    state.cart.couponCode = trimmed === '' ? null : trimmed
    state.cart.version += 1
    return { status: 200, body: cartBody(state, now) }
  })
}

// GET /api/cart — totals are re-priced at the current server time on every call.
export function getCart(): ServerResponse<CartBody> {
  const state = readState()
  return { status: 200, body: cartBody(state, serverNow()) }
}

// ---------- checks (each throws a ServerError, so nothing gets saved) ----------

function checkQuantity(quantity: number): void {
  const max = menu.shop.maxItemQuantity
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > max) {
    throw new ServerError(422, {
      code: 'INVALID_QUANTITY',
      message: `Quantity must be a whole number from 1 to ${max}.`,
    })
  }
}

function checkConfig(config: Config): void {
  const badQuantity = Object.values(config).some((qty) => !Number.isInteger(qty) || qty < 1)
  if (badQuantity) {
    throw new ServerError(422, {
      code: 'INVALID_CONFIG',
      message: 'Every chosen option needs a whole-number quantity of 1 or more.',
      violations: [],
    })
  }
  const violations = validate(config, menu.groups, menu.rules)
  if (violations.length > 0) {
    throw new ServerError(422, {
      code: 'INVALID_CONFIG',
      message: violations.map((v) => v.message).join('; '),
      violations,
    })
  }
}

function checkStock(need: Usage, available: Usage): void {
  const shortages = shortagesFor(need, available, menu)
  if (shortages.length > 0) {
    throw new ServerError(409, {
      code: 'OUT_OF_STOCK',
      message: formatShortages(shortages),
      shortages,
      available,
    })
  }
}

function failIfChaos(): void {
  if (takeReserveFailure()) {
    throw new ServerError(503, {
      code: 'RESERVE_FAILED',
      message: 'Could not reserve right now. Your selection is kept; please try again.',
    })
  }
}

function findItem(state: ServerState, itemId: string): CartItem {
  const item = state.cart.items.find((candidate) => candidate.id === itemId)
  if (!item) throw new ServerError(404, { code: 'NOT_FOUND', message: 'This cart item does not exist.' })
  return item
}

// ---------- building responses ----------

// Same saved answer for a repeated key. Only serverTime is fresh, so the
// browser's clock offset is not computed from an old time.
function replay(saved: SavedResponse, now: number): ServerResponse<ItemBody> {
  return { status: saved.status, body: { ...saved.body, serverTime: now } }
}

function itemView(item: CartItem, now: number): CartItemView {
  const unit = priceUnit(item.config, menu)
  return {
    ...item,
    status: isActive(item, now) ? 'active' : 'expired',
    unit,
    lineTotal: unit.unitPrice * item.quantity,
  }
}

function cartView(state: ServerState, now: number): CartView {
  return {
    version: state.cart.version,
    couponCode: state.cart.couponCode,
    items: state.cart.items.map((item) => itemView(item, now)),
  }
}

// Only active items are paid for; expired ones are shown but not counted.
function cartTotals(state: ServerState, now: number): CartBreakdown {
  const lines = activeItems(state, now).map(({ id, config, quantity }) => ({ id, config, quantity }))
  return priceCart(lines, menu, menu.promotions, now, state.cart.couponCode)
}

function itemBody(state: ServerState, item: CartItem, now: number): ItemBody {
  return { item: itemView(item, now), cart: cartView(state, now), serverTime: now }
}

function cartBody(state: ServerState, now: number): CartBody {
  return { cart: cartView(state, now), totals: cartTotals(state, now), serverTime: now }
}
