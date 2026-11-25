import type { DevBody, ServerResponse } from '../types/api'
import { failNextReserve, turnReserveFailureOff } from './chaos'
import { serverNow } from './clock'
import { STORAGE_KEY } from './storage'

// Dev tools (footer buttons). Only for demos: they are not part of the shop.

// POST /api/dev/fail-next-reserve — the next add/edit fails half-way, once (shows TC-14).
export function devFailNextReserve(): ServerResponse<DevBody> {
  failNextReserve()
  return { status: 200, body: { serverTime: serverNow() } }
}

// POST /api/dev/reset — forget cart, new orders and idempotency keys.
// With nothing saved, the next request starts from initialState() and loads the seed again.
export function devReset(): ServerResponse<DevBody> {
  localStorage.removeItem(STORAGE_KEY)
  turnReserveFailureOff()
  return { status: 200, body: { serverTime: serverNow() } }
}
