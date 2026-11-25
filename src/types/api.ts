import type { CartItemView, CartView } from './cart'
import type { Config, IngredientId, Shortage, Violation } from './menu'
import type { CartBreakdown } from './pricing'

// What a mock-server function gives back. MSW turns it into an HTTP response (Step 8).
export interface ServerResponse<Body> {
  status: number
  body: Body
}

// ---------- request bodies ----------

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

// ---------- success bodies (every one carries serverTime) ----------

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

// ---------- errors ----------

export type ErrorCode =
  | 'INVALID_CONFIG'
  | 'INVALID_QUANTITY'
  | 'OUT_OF_STOCK'
  | 'RESERVE_FAILED'
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'VERSION_CONFLICT'

export interface ErrorBody {
  code: ErrorCode
  message: string
  violations?: Violation[] // INVALID_CONFIG
  shortages?: Shortage[] // OUT_OF_STOCK
  available?: Record<IngredientId, number> // OUT_OF_STOCK: fresh numbers for the UI
  serverTime: number
}
