import { menu } from '../fixtures'
import { priceCart } from '../engine/pricing'
import type { CheckoutRequest, ErrorBody, OrderBody, OrdersBody, ServerResponse } from '../types/api'
import { PAYMENT_METHODS, isPaymentMethod } from '../types/order'
import { serverNow } from './clock'
import { ServerError, respond } from './http'
import { recall, remember } from './idempotency'
import { buildStoredOrder } from './orders'
import { readState, withState } from './state'
import { activeItems } from './stockView'

// POST /api/checkout — all active cart items become ONE order, in one commit.
// Reserved stock becomes sold stock by itself: the items leave the cart and the
// same lines are now in a 'checkout' order (stock is derived, see stockView.ts).
export function checkout(request: CheckoutRequest): ServerResponse<OrderBody | ErrorBody> {
  return respond(() =>
    withState((state) => {
      const now = serverNow()
      // Double click on Pay: same key → the same saved order, no second one.
      const saved = recall(state, 'checkout', request.idempotencyKey)
      if (saved) return { status: saved.status, body: { ...saved.body, serverTime: now } }

      if (!isPaymentMethod(request.paymentMethod)) {
        throw new ServerError(422, {
          code: 'INVALID_PAYMENT_METHOD',
          message: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}.`,
        })
      }

      // Expired items hold no stock and are never paid for.
      const lines = activeItems(state, now).map(({ id, config, quantity }) => ({ id, config, quantity }))
      if (lines.length === 0) {
        throw new ServerError(409, { code: 'CART_EMPTY', message: 'There is nothing active in the cart to pay for.' })
      }

      // D2: the price is locked now, at Pay, with server time and the cart's coupon.
      const breakdown = priceCart(lines, menu, menu.promotions, now, state.cart.couponCode)
      const order = buildStoredOrder({
        id: `ord_${crypto.randomUUID()}`,
        source: 'checkout',
        pricedAtMs: now,
        paymentMethod: request.paymentMethod,
        lines,
        breakdown,
        pricingWarnings: [],
      })

      state.orders.push(order)
      // The cart empties completely (expired leftovers and the coupon too).
      state.cart.items = []
      state.cart.couponCode = null
      state.cart.version += 1

      const response = { status: 201, body: { order, serverTime: now } }
      remember(state, request.idempotencyKey, { op: 'checkout', ...response }, now)
      return response
    }),
  )
}

// GET /api/orders — seed + checkout, in the order they were stored.
export function getOrders(): ServerResponse<OrdersBody> {
  const state = readState()
  return { status: 200, body: { orders: state.orders, serverTime: serverNow() } }
}
