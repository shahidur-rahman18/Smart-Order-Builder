import type { AddItemRequest, CheckoutRequest, EditItemRequest, PriceRequest } from '../types/api'
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

// { code: string | null }
export function parseCoupon(body: unknown): { code: string | null } | null {
  if (!isObject(body)) return null
  const { code } = body
  if (code !== null && typeof code !== 'string') return null
  return { code }
}

export function parseCheckout(body: unknown): CheckoutRequest | null {
  if (!isObject(body)) return null
  const { idempotencyKey, paymentMethod } = body
  if (typeof idempotencyKey !== 'string' || typeof paymentMethod !== 'string') return null
  return { idempotencyKey, paymentMethod }
}
