import type {
  AddItemRequest,
  CartBody,
  CheckoutRequest,
  DevBody,
  EditItemRequest,
  ErrorBody,
  ErrorCode,
  ItemBody,
  MenuBody,
  OrderBody,
  OrdersBody,
  PriceBody,
  PriceRequest,
  RemoveItemBody,
  StockBody,
} from '../types/api'
import { updateOffset } from './serverClock'

// Any non-2xx answer, or no answer at all (status 0, NETWORK_ERROR).
// The UI decides what to show from `code` (e.g. OUT_OF_STOCK → list shortages).
export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode | 'NETWORK_ERROR'
  readonly body: ErrorBody | null

  constructor(status: number, code: ErrorCode | 'NETWORK_ERROR', message: string, body: ErrorBody | null) {
    super(message)
    this.status = status
    this.code = code
    this.body = body
  }
}

function hasServerTime(value: unknown): value is { serverTime: number } {
  return typeof value === 'object' && value !== null && 'serverTime' in value && typeof value.serverTime === 'number'
}

function isErrorBody(value: unknown): value is ErrorBody {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value
}

async function request<Body>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<Body> {
  let response: Response
  try {
    // Full URL: the browser accepts "/api/…", but Node's fetch (tests) needs a base.
    response = await fetch(new URL(path, window.location.href), {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    // An aborted request is not a failure the user should see; let the caller ignore it.
    if (signal?.aborted) throw error
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.', null)
  }

  const json: unknown = await response.json()
  if (hasServerTime(json)) updateOffset(json.serverTime)

  if (!response.ok) {
    const errorBody = isErrorBody(json) ? json : null
    throw new ApiError(
      response.status,
      errorBody?.code ?? 'NETWORK_ERROR',
      errorBody?.message ?? `Request failed (${response.status}).`,
      errorBody,
    )
  }
  // Our own mock server built this body from the same shared types (src/types/api.ts),
  // so we trust its shape here instead of re-checking every field.
  return json as Body
}

// One function per endpoint (ARCHITECTURE §6).
export const api = {
  getMenu: () => request<MenuBody>('GET', '/api/menu'),
  getStock: () => request<StockBody>('GET', '/api/stock'),
  price: (body: PriceRequest, signal?: AbortSignal) => request<PriceBody>('POST', '/api/price', body, signal),
  getCart: () => request<CartBody>('GET', '/api/cart'),
  addItem: (body: AddItemRequest) => request<ItemBody>('POST', '/api/cart/items', body),
  editItem: (itemId: string, body: EditItemRequest) =>
    request<ItemBody>('PUT', `/api/cart/items/${encodeURIComponent(itemId)}`, body),
  removeItem: (itemId: string, itemVersion: number) =>
    request<RemoveItemBody>('DELETE', `/api/cart/items/${encodeURIComponent(itemId)}`, { itemVersion }),
  setCoupon: (code: string | null, cartVersion: number) =>
    request<CartBody>('PUT', '/api/cart/coupon', { code, cartVersion }),
  checkout: (body: CheckoutRequest) => request<OrderBody>('POST', '/api/checkout', body),
  getOrders: () => request<OrdersBody>('GET', '/api/orders'),
  // Dev tools only.
  devFailNextReserve: () => request<DevBody>('POST', '/api/dev/fail-next-reserve'),
  devReset: () => request<DevBody>('POST', '/api/dev/reset'),
}
