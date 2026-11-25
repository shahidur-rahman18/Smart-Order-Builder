import { menu } from '../fixtures'
import type { MenuBody, ServerResponse } from '../types/api'
import { serverNow } from './clock'

// GET /api/menu — the browser learns every group, option, price and rule from here.
export function getMenu(): ServerResponse<MenuBody> {
  return { status: 200, body: { menu, serverTime: serverNow() } }
}
