// Sales numbers for the assistant (C2 in DECISIONS.md).
// Pure: every function only uses the orders (and menu) it is given, so the
// same input always gives the same answer. tools.ts fetches fresh orders.
import { formatBdt, roundHalfUp } from '../engine/money'
import { localDate } from '../engine/time'
import type { Menu, OptionId, Poisha } from '../types/menu'
import type { StoredOrder } from '../types/order'
import type { CouponStatus } from '../types/pricing'

// Money is sent as poisha plus ready text, so the model never does arithmetic.
export interface Money {
  poisha: Poisha
  text: string // e.g. "BDT 4,995.00"
}

// Every stored order records its currency; with no orders there is nothing to show.
function moneyOf(poisha: Poisha, orders: StoredOrder[]): Money {
  const currency = orders[0]?.currency
  const amount = formatBdt(poisha)
  return { poisha, text: currency ? `${currency} ${amount}` : amount }
}

function sumPayable(orders: StoredOrder[]): Poisha {
  return orders.reduce((sum, order) => sum + order.totals.payable, 0)
}

// 1. How many orders?
export function countOrders(orders: StoredOrder[]): { count: number } {
  return { count: orders.length }
}

// 2. Total revenue = sum of every order's payable.
export function totalRevenue(orders: StoredOrder[]): { orderCount: number; revenue: Money } {
  return { orderCount: orders.length, revenue: moneyOf(sumPayable(orders), orders) }
}

// 3. Best-selling options by units.
export interface OptionUnits {
  optionId: OptionId
  name: string
  units: number
}

// Units of every option: line quantity × option qty, over all orders.
function unitsByOption(orders: StoredOrder[]): Map<OptionId, number> {
  const units = new Map<OptionId, number>()
  for (const order of orders) {
    for (const line of order.lines) {
      for (const [optionId, qty] of Object.entries(line.config)) {
        units.set(optionId, (units.get(optionId) ?? 0) + line.quantity * qty)
      }
    }
  }
  return units
}

// Top `limit` options, most units first. Options with the same units keep
// menu order, and anything tied with the last place is kept too, so a tie
// is never hidden by the cut. `tie` = first place is shared.
export function bestSellingOptions(
  orders: StoredOrder[],
  menu: Menu,
  limit = 1,
): { options: OptionUnits[]; tie: boolean } {
  const menuOptions = menu.groups.flatMap((group) => group.options)
  const units = unitsByOption(orders)

  const ranked: OptionUnits[] = menuOptions
    .map((option) => ({ optionId: option.id, name: option.name, units: units.get(option.id) ?? 0 }))
    .filter((row) => row.units > 0)
    .sort((a, b) => b.units - a.units) // stable sort: equal units stay in menu order

  if (ranked.length === 0) return { options: [], tie: false }

  const safeLimit = Math.max(1, Math.floor(limit))
  const cutoff = ranked[Math.min(safeLimit, ranked.length) - 1].units
  const options = ranked.filter((row, i) => i < safeLimit || row.units === cutoff)
  const tie = ranked.length > 1 && ranked[1].units === ranked[0].units

  return { options, tie }
}

// 4. Revenue by payment method: grouped by what each order records (no fixed list).
export interface MethodRevenue {
  method: string
  orderCount: number
  revenue: Money
}

export function revenueByPaymentMethod(orders: StoredOrder[]): { methods: MethodRevenue[] } {
  const byMethod = new Map<string, StoredOrder[]>()
  for (const order of orders) {
    byMethod.set(order.paymentMethod, [...(byMethod.get(order.paymentMethod) ?? []), order])
  }

  const methods = [...byMethod.entries()]
    .map(([method, group]) => ({
      method,
      orderCount: group.length,
      revenue: moneyOf(sumPayable(group), orders),
    }))
    .sort((a, b) => b.revenue.poisha - a.revenue.poisha)

  return { methods }
}

// 5. Average order value, rounded half up to a whole poisha.
export function averageOrderValue(orders: StoredOrder[]): { orderCount: number; average: Money | null } {
  if (orders.length === 0) return { orderCount: 0, average: null }
  const average = roundHalfUp(sumPayable(orders), orders.length)
  return { orderCount: orders.length, average: moneyOf(average, orders) }
}

// 6. Coupon usage. "Got the coupon" means coupon.applied, not just a typed code.
export interface CouponMiss {
  orderId: string
  code: string
  status: CouponStatus
  reason: string
}

export function couponUsage(orders: StoredOrder[]): {
  enteredCount: number
  appliedCount: number
  appliedOrderIds: string[]
  notApplied: CouponMiss[]
} {
  const entered = orders.filter((order) => order.coupon.entered)
  const applied = entered.filter((order) => order.coupon.applied)
  const notApplied = entered
    .filter((order) => !order.coupon.applied)
    .map((order) => ({
      orderId: order.id,
      code: order.coupon.entered ?? '',
      status: order.coupon.status,
      reason: order.coupon.reason,
    }))

  return {
    enteredCount: entered.length,
    appliedCount: applied.length,
    appliedOrderIds: applied.map((order) => order.id),
    notApplied,
  }
}

// 7. Orders on one calendar date in the shop's time zone.
export type OrdersOnDateResult =
  | { ok: true; date: string; timeZone: string; count: number; orderIds: string[]; revenue: Money }
  | { ok: false; error: string }

// "YYYY-MM-DD" and a real day (2026-02-30 is not).
function isValidDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const asUtc = new Date(Date.UTC(year, month - 1, day))
  return asUtc.getUTCFullYear() === year && asUtc.getUTCMonth() === month - 1 && asUtc.getUTCDate() === day
}

export function ordersOnDate(orders: StoredOrder[], date: string, timeZone: string): OrdersOnDateResult {
  if (!isValidDate(date)) {
    return { ok: false, error: `"${date}" is not a valid date. Use YYYY-MM-DD, for example 2026-11-20.` }
  }
  const onDate = orders.filter((order) => localDate(Date.parse(order.createdAt), timeZone) === date)
  return {
    ok: true,
    date,
    timeZone,
    count: onDate.length,
    orderIds: onDate.map((order) => order.id),
    revenue: moneyOf(sumPayable(onDate), orders),
  }
}

// 8. What the bot can and cannot answer. Used for "what can you do?" and for
// questions the data cannot answer (e.g. customers, D5).
export function describeData(): { canAnswer: string[]; inData: string[]; notInData: string[] } {
  return {
    canAnswer: [
      'how many orders there are',
      'total revenue',
      'the best-selling options by units',
      'revenue and order count per payment method',
      'average order value',
      'how many orders entered a coupon and how many really got the discount',
      'orders and revenue on a given date',
    ],
    inData: [
      'order id and time',
      'payment method',
      'chosen options and quantities',
      'coupon entered and whether it was applied',
      'subtotal, discount, VAT and payable',
    ],
    notInData: [
      'customer names or any customer identity',
      'phone numbers, emails or addresses',
      'staff names',
      'refunds or deliveries',
    ],
  }
}
