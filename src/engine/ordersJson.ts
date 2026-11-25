import type { StoredOrder } from '../types/order'

// Content of the "Download orders.json" file: every order, exactly as stored (D6).
// Pure, so the Download button and the TC-17 test use the very same function.
export function ordersToJson(orders: StoredOrder[]): string {
  return JSON.stringify(orders, null, 2)
}
