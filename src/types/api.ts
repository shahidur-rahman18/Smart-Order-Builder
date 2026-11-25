import type { CartItemView, CartView } from './cart'
import type { Config, IngredientId, Menu, Poisha, Shortage, Violation } from './menu'
import type { StoredOrder } from './order'
import type { CartBreakdown, UnitBreakdown } from './pricing'

// What a mock-server function gives back. MSW turns it into an HTTP response (Step 8).
export interface ServerResponse<Body> {
  status: number
  body: Body
}

// ---------- request bodies ----------

// requestId comes back unchanged, so the browser can drop an old (stale) answer (TC-12).
export interface PriceRequest {
  requestId: string
  config: Config
  quantity: number
}

export interface AddItemRequest {
  idempotencyKey: string
  config: Config
  quantity: number
}

export interface EditItemRequest {
  idempotencyKey: string
  config: Config
  quantity: number
  itemVersion: number
}

export interface CheckoutRequest {
  idempotencyKey: string
  paymentMethod: string // checked against PAYMENT_METHODS on the server
}

// ---------- success bodies (every one carries serverTime) ----------

export interface MenuBody {
  menu: Menu
  serverTime: number
}

// breakdown is null when the config cannot be priced (e.g. min not met yet):
// the violations say why.
export interface PriceBody {
  requestId: string
  breakdown: UnitBreakdown | null
  lineTotal: Poisha | null
  violations: Violation[]
  serverTime: number
}

export interface ItemBody {
  item: CartItemView
  cart: CartView
  serverTime: number
}

export interface CartBody {
  cart: CartView
  totals: CartBreakdown
  serverTime: number
}

export interface RemoveItemBody {
  cart: CartView
  serverTime: number
}

export interface StockBody {
  stock: Record<IngredientId, number> // from the fixture
  sold: Record<IngredientId, number> // live (checkout) orders only
  reserved: Record<IngredientId, number> // active cart items only
  available: Record<IngredientId, number>
  serverTime: number
}

export interface OrderBody {
  order: StoredOrder
  serverTime: number
}

export interface OrdersBody {
  orders: StoredOrder[]
  serverTime: number
}

// Dev tools answers carry nothing but the time.
export interface DevBody {
  serverTime: number
}

// ---------- errors ----------

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'INVALID_CONFIG'
  | 'INVALID_QUANTITY'
  | 'OUT_OF_STOCK'
  | 'RESERVE_FAILED'
  | 'PRICE_UNAVAILABLE'
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'VERSION_CONFLICT'
  | 'CART_EMPTY'
  | 'INVALID_PAYMENT_METHOD'

export interface ErrorBody {
  code: ErrorCode
  message: string
  violations?: Violation[] // INVALID_CONFIG
  shortages?: Shortage[] // OUT_OF_STOCK
  available?: Record<IngredientId, number> // OUT_OF_STOCK: fresh numbers for the UI
  serverTime: number
}
