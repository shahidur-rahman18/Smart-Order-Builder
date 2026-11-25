import { menu } from '../fixtures'
import { priceUnit } from '../engine/pricing'
import { validate } from '../engine/validate'
import type { ErrorBody, PriceBody, PriceRequest, ServerResponse } from '../types/api'
import { checkQuantity } from './cart'
import { shouldFailPrice } from './chaos'
import { serverNow } from './clock'
import { ServerError, respond } from './http'

// POST /api/price — price preview while the customer is still choosing.
// Read-only: it never touches the saved state.
export function pricePreview(request: PriceRequest): ServerResponse<PriceBody | ErrorBody> {
  return respond(() => {
    const now = serverNow()
    // Chaos (15 % by default) so the UI must show Retry and keep the config.
    if (shouldFailPrice()) {
      throw new ServerError(503, {
        code: 'PRICE_UNAVAILABLE',
        message: 'Price is not available right now. Please retry.',
      })
    }

    const { requestId, config, quantity } = request
    checkQuantity(quantity)

    const violations = validate(config, menu.groups, menu.rules)
    // An option the menu does not know has no price, so there is nothing to show.
    // Other violations (e.g. a missing group) still get the "price so far".
    const canPrice = violations.every((v) => v.kind !== 'unknown')
    const breakdown = canPrice ? priceUnit(config, menu) : null

    return {
      status: 200,
      body: {
        requestId,
        breakdown,
        lineTotal: breakdown ? breakdown.unitPrice * quantity : null,
        violations,
        serverTime: now,
      },
    }
  })
}
