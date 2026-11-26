// SPEC §10: every ANSWERS.md value is printed by this file.
// Run: npm run answers
// Each answer is computed by the real engines (validate, priceUnit, priceCart,
// stock, stats) and then checked with expect(), so ANSWERS.md cannot drift.
import { describe, expect, it } from 'vitest'
import { menu, seed } from '../fixtures'
import { formatBdt } from '../engine/money'
import { priceCart, priceUnit } from '../engine/pricing'
import { availableForEdit, availableStock, shortagesFor, usageOf } from '../engine/stock'
import { validate } from '../engine/validate'
import { bestSellingOptions, couponUsage, revenueByPaymentMethod, totalRevenue } from '../assistant/stats'
import { normalizeSeedOrder, priceSeedOrder } from '../server/seed'
import { configA, configB, configByNames, configC } from '../test/builders'
import type { CartLineInput, Config, Group } from '../types/menu'
import type { CartBreakdown } from '../types/pricing'

const COUPON = 'MORNING15'
const at = (iso: string) => Date.parse(iso)
// Order time as the shop sees it, e.g. "2026-11-22 13:10" (Asia/Dhaka).
const shopTime = (iso: string) =>
  new Date(iso).toLocaleString('sv-SE', { timeZone: menu.shop.timeZone }).slice(0, 16)

const optionName = (id: string) =>
  menu.groups.flatMap((g) => g.options).find((o) => o.id === id)?.name ?? id
const ingredientName = (id: string) => menu.ingredients.find((i) => i.id === id)?.name ?? id
const describeConfig = (config: Config) =>
  Object.entries(config)
    .map(([id, qty]) => (qty === 1 ? optionName(id) : `${optionName(id)} x${qty}`))
    .join(', ')

// Prints one cart's breakdown the way ANSWERS.md shows it.
function printCart(title: string, result: CartBreakdown) {
  const lines = [
    title,
    `  subtotal        ${formatBdt(result.subtotal)}`,
    ...result.candidates.map(
      (c) => `  ${c.id.padEnd(4)} ${c.eligible ? 'eligible' : 'not eligible'} ${formatBdt(c.amount)} — ${c.reason}`,
    ),
    `  chosen discount ${result.appliedDiscount ? `${result.appliedDiscount.id} ${formatBdt(result.appliedDiscount.amount)}` : 'none'}`,
    `  after discount  ${formatBdt(result.discountedSubtotal)}`,
    `  VAT ${menu.shop.vatPercent}%          ${formatBdt(result.vat)}`,
    `  exact payable   ${formatBdt(result.payableExact)}`,
    `  payable         ${formatBdt(result.payable)}`,
  ]
  console.log(lines.join('\n'))
}

// ---------- Q2 helper: every valid configuration of the menu ----------

// All quantity choices for one group that pass that group's own limits.
// Each option goes from 0 to maxPerOption (or the group max).
function groupChoices(group: Group): Config[] {
  const cap = group.maxPerOption ?? group.max
  if (cap === undefined) throw new Error(`Group ${group.id} has no per-option limit to search with`)

  let partial: Config[] = [{}]
  for (const option of group.options) {
    const next: Config[] = []
    for (const config of partial) {
      for (let qty = 0; qty <= cap; qty++) {
        next.push(qty === 0 ? config : { ...config, [option.id]: qty })
      }
    }
    partial = next
  }
  // Group limits only (no rules yet): rules can only remove more configs later.
  return partial.filter((config) => validate(config, [group], []).length === 0)
}

// Walks the cross product of every group's choices one config at a time
// (1.3 million combinations: too many to keep in one array), and yields only
// those that pass the full validate() with all rules.
function* allValidConfigs(): Generator<Config> {
  const choicesPerGroup = menu.groups.map(groupChoices)
  function* combine(index: number, config: Config): Generator<Config> {
    if (index === choicesPerGroup.length) {
      if (validate(config, menu.groups, menu.rules).length === 0) yield config
      return
    }
    for (const choice of choicesPerGroup[index]) {
      yield* combine(index + 1, { ...config, ...choice })
    }
  }
  yield* combine(0, {})
}

// ---------- the eight answers ----------

describe('ANSWERS.md (SPEC §10)', () => {
  it('Q1: max item C from an empty cart is 2, limited by cheese', () => {
    const emptyStock = availableStock(menu, [], [])
    const fits = (count: number) => shortagesFor(usageOf(configC(), menu, count), emptyStock, menu).length === 0

    let max = 0
    while (fits(max + 1)) max++

    const perItem = usageOf(configC(), menu, 1)
    console.log(
      [
        'Q1. Item C, one unit uses (stock / per item = how many fit):',
        ...Object.entries(perItem).map(
          ([id, n]) => `  ${ingredientName(id).padEnd(12)} ${n} per item, stock ${emptyStock[id]} → ${Math.floor(emptyStock[id] / n)}`,
        ),
        `  max C = ${max}`,
        `  item ${max + 1} is blocked: ${shortagesFor(usageOf(configC(), menu, max + 1), emptyStock, menu)
          .map((s) => `short ${s.missing} ${s.name}`)
          .join(', ')}`,
      ].join('\n'),
    )

    expect(max).toBe(2)
    expect(shortagesFor(usageOf(configC(), menu, 3), emptyStock, menu)).toEqual([
      { ingredient: 'cheese', name: 'cheese', missing: 2 },
    ])
  })

  it('Q2: cheapest valid configuration is Toast, Fried x2, Tofu at BDT 360.00', () => {
    let validCount = 0
    let cheapestPrice = Number.POSITIVE_INFINITY
    let cheapest: Config[] = []
    for (const config of allValidConfigs()) {
      validCount++
      const price = priceUnit(config, menu).unitPrice
      if (price < cheapestPrice) {
        cheapestPrice = price
        cheapest = [config]
      } else if (price === cheapestPrice) {
        cheapest.push(config)
      }
    }

    console.log(
      [
        `Q2. Checked ${validCount} valid configurations.`,
        `  cheapest unit price: BDT ${formatBdt(cheapestPrice)}`,
        ...cheapest.map((config) => `  - ${describeConfig(config)}`),
      ].join('\n'),
    )

    expect(cheapestPrice).toBe(36000)
    // Ketchup costs 0, so adding it gives the same price: two configs tie.
    expect(cheapest).toEqual([
      configByNames({ Toast: 1, Fried: 2, Tofu: 1 }),
      configByNames({ Toast: 1, Fried: 2, Tofu: 1, Ketchup: 1 }),
    ])
  }, 60_000) // checks every valid config (~11 s), more than the 5 s default

  it('Q3: A x3 with MORNING15 at 10:30 vs 11:30', () => {
    const cart: CartLineInput[] = [{ id: 'a', config: configA(), quantity: 3 }]
    const unit = priceUnit(configA(), menu)
    console.log(
      `Q3. Unit A = base ${formatBdt(unit.base)} + options ${formatBdt(unit.optionsTotal)} = ${formatBdt(unit.unitPrice)} ` +
        `(extras deal ${formatBdt(unit.cheapestFree.discount)}, combo ${formatBdt(unit.combo.discount)})`,
    )

    const morning = priceCart(cart, menu, menu.promotions, at('2026-11-26T10:30:00+06:00'), COUPON)
    printCart('Q3. A x3 at 10:30 (MORNING15 entered)', morning)
    const late = priceCart(cart, menu, menu.promotions, at('2026-11-26T11:30:00+06:00'), COUPON)
    printCart('Q3. A x3 at 11:30 (MORNING15 entered)', late)

    expect(unit.unitPrice).toBe(38000)
    expect(morning.subtotal).toBe(114000)
    expect(morning.appliedDiscount).toEqual({ id: 'C2', amount: 15000 })
    expect(morning.vat).toBe(4950)
    expect(morning.payableExact).toBe(103950)
    expect(morning.payable).toBe(104000)

    expect(late.subtotal).toBe(114000)
    expect(late.appliedDiscount).toBeNull()
    expect(late.coupon.status).toBe('expired_time')
    expect(late.vat).toBe(5700)
    expect(late.payable).toBe(119700)
  })

  it('Q4: after TC-10 (B = Omelette x1 + Fried x3, C x2) payable at 11:30 is 1,600', () => {
    const newB = { ...configB(), ...configByNames({ Omelette: 1, Fried: 3 }) }
    const lineB: CartLineInput = { id: 'b', config: configB(), quantity: 1 }
    const lineC: CartLineInput = { id: 'c', config: configC(), quantity: 2 }

    // Same check as TC-10: the edit is allowed.
    const available = availableForEdit(availableStock(menu, [], [lineB, lineC]), lineB, menu)
    expect(shortagesFor(usageOf(newB, menu, 1), available, menu)).toEqual([])

    const cart = [{ ...lineB, config: newB }, lineC]
    const result = priceCart(cart, menu, menu.promotions, at('2026-11-26T11:30:00+06:00'), COUPON)
    printCart('Q4. B (edited) x1 + C x2 at 11:30 (MORNING15 entered, too late)', result)

    expect(result.subtotal).toBe(64350 + 2 * 49000)
    expect(result.appliedDiscount).toEqual({ id: 'C1', amount: 10000 })
    expect(result.vat).toBe(7618)
    expect(result.payableExact).toBe(159968)
    expect(result.payable).toBe(160000)
  })

  const pricedSeed = () => seed.orders.map((raw) => priceSeedOrder(normalizeSeedOrder(raw)))

  it('Q5: payable of each seed order and total revenue 4,995.00', () => {
    const orders = pricedSeed()
    console.log(
      [
        'Q5. Seed orders priced at their own createdAt:',
        ...orders.map(
          (o) =>
            `  ${o.id}  subtotal ${formatBdt(o.totals.subtotal).padStart(8)}  ` +
            `discount ${(o.totals.discount ? `${o.totals.discount.id} ${formatBdt(o.totals.discount.amount)}` : 'none').padEnd(11)}  ` +
            `VAT ${formatBdt(o.totals.vat).padStart(6)}  payable ${formatBdt(o.totals.payable).padStart(8)}`,
        ),
        `  total revenue: ${totalRevenue(orders).revenue.text}`,
      ].join('\n'),
    )

    expect(orders.map((o) => [o.id, o.totals.payable])).toEqual([
      ['ORD-1001', 33900],
      ['ORD-1002', 71300],
      ['ORD-1003', 127100],
      ['ORD-1004', 57800],
      ['ORD-1005', 86600],
      ['ORD-1006', 122800],
    ])
    expect(totalRevenue(orders).revenue.poisha).toBe(499500)
  })

  it('Q6: best-selling option is Fried with 10 units', () => {
    const top = bestSellingOptions(pricedSeed(), menu, 5)
    console.log(
      [
        'Q6. Units sold (line quantity x option quantity), top 5 + ties:',
        ...top.options.map((o) => `  ${o.name.padEnd(16)} ${o.units}`),
      ].join('\n'),
    )

    expect(top.tie).toBe(false)
    expect(top.options[0]).toEqual({ optionId: 'fried', name: 'Fried', units: 10 })
  })

  it('Q7: card brought in the most revenue (2,145.00)', () => {
    const { methods } = revenueByPaymentMethod(pricedSeed())
    console.log(
      [
        'Q7. Revenue by payment method:',
        ...methods.map((m) => `  ${m.method.padEnd(6)} ${m.orderCount} orders  ${m.revenue.text}`),
      ].join('\n'),
    )

    expect(methods[0].method).toBe('card')
    expect(methods[0].revenue.poisha).toBe(214500)
  })

  it('Q8: 3 seed orders got MORNING15; ORD-1006 had the code but was after 11:00', () => {
    const orders = pricedSeed()
    const usage = couponUsage(orders)
    console.log(
      [
        'Q8. Every seed order with a coupon code:',
        ...orders
          .filter((o) => o.coupon.entered)
          .map((o) => {
            const c2 = priceCart(
              o.lines.map((l) => ({ id: l.lineId, config: l.config, quantity: l.quantity })),
              menu,
              menu.promotions,
              Date.parse(o.createdAt),
              o.coupon.entered,
            ).candidates.map((c) => `${c.id} ${c.eligible ? formatBdt(c.amount) : 'no'}`)
            return `  ${o.id} at ${shopTime(o.createdAt)} → ${o.coupon.status} (${o.coupon.reason}); candidates: ${c2.join(', ')}`
          }),
        `  entered ${usage.enteredCount}, really applied ${usage.appliedCount}: ${usage.appliedOrderIds.join(', ')}`,
      ].join('\n'),
    )

    expect(usage.enteredCount).toBe(4)
    expect(usage.appliedCount).toBe(3)
    expect(usage.appliedOrderIds).toEqual(['ORD-1001', 'ORD-1003', 'ORD-1005'])
    expect(usage.notApplied.map((m) => [m.orderId, m.status])).toEqual([['ORD-1006', 'expired_time']])
  })
})
