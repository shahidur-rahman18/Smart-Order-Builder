import type {
  AddItemRequest,
  CheckoutRequest,
  CouponRequest,
  EditItemRequest,
  PriceRequest,
  RemoveItemRequest,
} from '../types/api'
import type { Config } from '../types/menu'

// The request body arrives as unknown JSON. These checks only make sure the
// SHAPE is right (strings are strings, numbers are numbers). Whether the values
// make sense (quantity 1…max, rules, stock) is the server functions' job.
// Each one returns null for a bad shape, and the handler answers 400.

type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isConfig(value: unknown): value is Config {
  return isObject(value) && Object.values(value).every((qty) => typeof qty === 'number')
}

export function parsePrice(body: unknown): PriceRequest | null {
  if (!isObject(body)) return null
  const { requestId, config, quantity } = body
  if (typeof requestId !== 'string' || !isConfig(config) || typeof quantity !== 'number') return null
  return { requestId, config, quantity }
}

export function parseAddItem(body: unknown): AddItemRequest | null {
  if (!isObject(body)) return null
  const { idempotencyKey, config, quantity } = body
  if (typeof idempotencyKey !== 'string' || !isConfig(config) || typeof quantity !== 'number') return null
  return { idempotencyKey, config, quantity }
}

export function parseEditItem(body: unknown): EditItemRequest | null {
  const base = parseAddItem(body)
  if (!base || !isObject(body) || typeof body.itemVersion !== 'number') return null
  return { ...base, itemVersion: body.itemVersion }
}

export function parseCoupon(body: unknown): CouponRequest | null {
  if (!isObject(body)) return null
  const { code, cartVersion } = body
  if ((code !== null && typeof code !== 'string') || typeof cartVersion !== 'number') return null
  return { code, cartVersion }
}

export function parseRemoveItem(body: unknown): RemoveItemRequest | null {
  if (!isObject(body) || typeof body.itemVersion !== 'number') return null
  return { itemVersion: body.itemVersion }
}

export function parseCheckout(body: unknown): CheckoutRequest | null {
  if (!isObject(body)) return null
  const { idempotencyKey, paymentMethod, cartVersion } = body
  if (typeof idempotencyKey !== 'string' || typeof paymentMethod !== 'string' || typeof cartVersion !== 'number') {
    return null
  }
  return { idempotencyKey, paymentMethod, cartVersion }
}
