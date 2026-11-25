import type { CartLineInput, Config, Group, Menu, Poisha, Promotion } from '../types/menu'
import type {
  CartBreakdown,
  CouponResult,
  DiscountCandidate,
  UnitBreakdown,
} from '../types/pricing'
import { formatBdt, percentOf, toWholeBdtPoisha } from './money'
import { isStrictlyBefore } from './time'

type CouponPromo = Extract<Promotion, { type: 'couponPercent' }>

// ---------- one item (SPEC Part C steps 1–3) ----------

// Price of ONE item. Pure: same config + menu + promos → same answer.
// Does not validate: call validate() first. Throws only for an option id the
// menu does not know, because we cannot bill something that has no price.
export function priceUnit(config: Config, menu: Menu, promos: Promotion[] = menu.promotions): UnitBreakdown {
  assertKnownOptions(config, menu.groups)

  // Step 1: base + every option's price × its quantity.
  const base = menu.product.basePrice
  const optionsTotal = menu.groups
    .flatMap((group) => group.options)
    .reduce((sum, option) => sum + option.price * qtyOf(config, option.id), 0)
  const step1 = base + optionsTotal

  // Step 2: extras deal (cheapest unit of every N is free).
  const cheapestFree = { freeUnits: 0, discount: 0 }
  for (const promo of promos) {
    if (promo.type !== 'cheapestFree') continue
    const group = findGroup(menu.groups, promo.group)
    if (!group) continue
    const deal = cheapestFreeDeal(group, config, promo.every)
    cheapestFree.freeUnits += deal.freeUnits
    cheapestFree.discount += deal.discount
  }
  const step2 = step1 - cheapestFree.discount

  // Step 3: combo percent, taken from the step-2 amount.
  const combo = { applied: false, discount: 0 }
  for (const promo of promos) {
    if (promo.type !== 'comboPercent') continue
    const met = promo.conditions.every(
      (c) => groupUnits(findGroup(menu.groups, c.group), config) >= c.minUnits,
    )
    if (!met) continue
    combo.applied = true
    combo.discount += percentOf(step2, promo.percent)
  }

  return { base, optionsTotal, step1, cheapestFree, step2, combo, unitPrice: step2 - combo.discount }
}

// Every unit of the group, one price per unit (Mushroom x2 → two entries),
// cheapest first. The first floor(units / every) are free.
function cheapestFreeDeal(group: Group, config: Config, every: number) {
  const unitPrices: Poisha[] = []
  for (const option of group.options) {
    for (let i = 0; i < qtyOf(config, option.id); i++) unitPrices.push(option.price)
  }
  unitPrices.sort((a, b) => a - b)
  const freeUnits = Math.floor(unitPrices.length / every)
  const discount = unitPrices.slice(0, freeUnits).reduce((sum, p) => sum + p, 0)
  return { freeUnits, discount }
}

// Units = how many things the customer picked in the group (Omelette x1 = 1 unit,
// even though it uses 2 eggs from stock). Pricing counts picks, not ingredients.
function groupUnits(group: Group | undefined, config: Config): number {
  if (!group) return 0
  return group.options.reduce((sum, option) => sum + qtyOf(config, option.id), 0)
}

// ---------- whole cart (SPEC Part C steps 4–6) ----------

// The single pricing function used by the mock server, the UI preview and the tests.
// couponCode is an extra 5th argument (SPEC lists 4): without it C2 cannot be checked.
export function priceCart(
  cart: CartLineInput[],
  menu: Menu,
  promos: Promotion[],
  serverTime: number,
  couponCode?: string | null,
): CartBreakdown {
  // Step 4: line totals and subtotal.
  const lines = cart.map((line) => {
    const unit = priceUnit(line.config, menu, promos)
    return { id: line.id, unit, quantity: line.quantity, lineTotal: unit.unitPrice * line.quantity }
  })
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)

  // Step 5: list every cart discount, then only the best one applies.
  const entered = normalizeCode(couponCode)
  const candidates: DiscountCandidate[] = []
  for (const promo of promos) {
    if (promo.type === 'cartFixed') {
      const eligible = subtotal >= promo.minSubtotal
      candidates.push({
        id: promo.id,
        amount: Math.min(promo.amount, subtotal), // never more than the cart is worth
        eligible,
        reason: eligible
          ? `${formatBdt(promo.amount)} off orders of ${formatBdt(promo.minSubtotal)} or more`
          : `Subtotal ${formatBdt(subtotal)} is below ${formatBdt(promo.minSubtotal)}`,
      })
    }
    if (promo.type === 'couponPercent') {
      const check = checkCoupon(promo, entered, serverTime, menu.shop.timeZone)
      candidates.push({
        id: promo.id,
        amount: Math.min(percentOf(subtotal, promo.percent), promo.cap),
        eligible: check.ok,
        reason: check.reason,
      })
    }
  }
  const best = pickBest(candidates, menu.shop.cartDiscountTieBreak)
  const appliedDiscount = best ? { id: best.id, amount: best.amount } : null
  const discountedSubtotal = subtotal - (appliedDiscount?.amount ?? 0)

  // Step 6: VAT on the discounted subtotal; only the final payable is rounded to whole BDT.
  const vat = percentOf(discountedSubtotal, menu.shop.vatPercent)
  const payableExact = discountedSubtotal + vat

  return {
    lines,
    subtotal,
    candidates,
    appliedDiscount,
    coupon: couponResult(entered, promos, serverTime, menu.shop.timeZone, appliedDiscount?.id ?? null),
    discountedSubtotal,
    vat,
    payableExact,
    payable: toWholeBdtPoisha(payableExact),
  }
}

// Larger amount wins. On a tie, the id that comes first in tieBreak wins.
function pickBest(candidates: DiscountCandidate[], tieBreak: string[]): DiscountCandidate | null {
  const rank = (id: string) => {
    const index = tieBreak.indexOf(id)
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
  let best: DiscountCandidate | null = null
  for (const c of candidates) {
    if (!c.eligible) continue
    if (!best || c.amount > best.amount || (c.amount === best.amount && rank(c.id) < rank(best.id))) {
      best = c
    }
  }
  return best
}

// ---------- coupon ----------

// Customers type " morning15 ": trim + ignore case. Empty input = no coupon.
function normalizeCode(code: string | null | undefined): string | null {
  const trimmed = (code ?? '').trim()
  return trimmed === '' ? null : trimmed
}

function codeMatches(promo: CouponPromo, entered: string | null): boolean {
  return entered !== null && entered.toLowerCase() === promo.code.toLowerCase()
}

function checkCoupon(promo: CouponPromo, entered: string | null, serverTime: number, timeZone: string) {
  if (entered === null) return { ok: false, reason: 'No coupon entered' }
  if (!codeMatches(promo, entered)) return { ok: false, reason: `Code "${entered}" is not ${promo.code}` }
  if (!isStrictlyBefore(serverTime, promo.validBefore, timeZone)) {
    return { ok: false, reason: `${promo.code} is valid only before ${promo.validBefore}` }
  }
  return { ok: true, reason: `${promo.code}: ${promo.percent}% off, up to ${formatBdt(promo.cap)}` }
}

// What the coupon box should tell the customer.
function couponResult(
  entered: string | null,
  promos: Promotion[],
  serverTime: number,
  timeZone: string,
  appliedId: string | null,
): CouponResult {
  if (entered === null) {
    return { entered, applied: false, status: 'not_entered', reason: 'No coupon entered' }
  }
  const promo = promos.find(
    (p): p is CouponPromo => p.type === 'couponPercent' && codeMatches(p, entered),
  )
  if (!promo) {
    return { entered, applied: false, status: 'invalid_code', reason: `"${entered}" is not a valid coupon` }
  }
  if (!isStrictlyBefore(serverTime, promo.validBefore, timeZone)) {
    return { entered, applied: false, status: 'expired_time', reason: `${promo.code} is valid only before ${promo.validBefore}` }
  }
  if (appliedId !== promo.id) {
    return { entered, applied: false, status: 'lost_to_better_discount', reason: 'Another discount saves you more' }
  }
  return { entered, applied: true, status: 'applied', reason: `${promo.code} applied` }
}

// ---------- small helpers ----------

function qtyOf(config: Config, optionId: string): number {
  return config[optionId] ?? 0
}

function findGroup(groups: Group[], groupId: string): Group | undefined {
  return groups.find((group) => group.id === groupId)
}

function assertKnownOptions(config: Config, groups: Group[]): void {
  const known = new Set(groups.flatMap((group) => group.options.map((option) => option.id)))
  for (const optionId of Object.keys(config)) {
    if (!known.has(optionId)) throw new Error(`Cannot price unknown option: ${optionId}`)
  }
}
