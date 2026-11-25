import type { Config } from './menu'

// Shape of src/fixtures/orders.seed.json (no prices, on purpose).
export interface SeedOrder {
  id: string
  createdAt: string // ISO with offset, e.g. "2026-11-20T09:15:00+06:00"
  paymentMethod: string
  couponCode: string | null
  lines: { qty: number; options: Config }[]
}

export interface SeedFile {
  schemaVersion: number
  currency: string
  note: string
  orders: SeedOrder[]
}
