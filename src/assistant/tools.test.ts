import { describe, expect, it } from 'vitest'
import { menu } from '../fixtures'
import { addItem } from '../server/cart'
import { checkout } from '../server/checkout'
import { configA } from '../test/builders'
import { cartVersion, ok } from '../test/serverHelpers'
import { TOOL_NAMES, runTool, toolDeclarations } from './tools'

describe('tool declarations (what Gemini is allowed to call)', () => {
  it('declares exactly the eight C2 functions', () => {
    expect(toolDeclarations.map((tool) => tool.name)).toEqual([...TOOL_NAMES])
    expect(TOOL_NAMES).toEqual([
      'countOrders',
      'totalRevenue',
      'bestSellingOptions',
      'revenueByPaymentMethod',
      'averageOrderValue',
      'couponUsage',
      'ordersOnDate',
      'describeData',
    ])
  })

  it('has no customer tool (D5): nothing to invent a name from', () => {
    const text = JSON.stringify(toolDeclarations)
    expect(text).not.toMatch(/customerName|getCustomer|bestCustomer/i)
  })
})

describe('runTool', () => {
  it('TC-18 (tool level): a new checkout shows up in the next call, no reload', async () => {
    const before = await runTool('countOrders', {})
    expect(before).toEqual({ count: 6 })

    ok(addItem({ idempotencyKey: 'add-tool', config: configA(), quantity: 1 }))
    ok(checkout({ idempotencyKey: 'pay-tool', paymentMethod: 'cash', cartVersion: cartVersion() }))

    const after = await runTool('countOrders', {})
    expect(after).toEqual({ count: 7 })
  })

  it('best-selling option uses fresh orders and menu names', async () => {
    const result = await runTool('bestSellingOptions', {})
    expect(result).toEqual({ options: [{ optionId: 'fried', name: 'Fried', units: 10 }], tie: false })
  })

  it('passes limit through, and ignores a bad limit', async () => {
    const two = await runTool('bestSellingOptions', { limit: 2 })
    expect(two).toMatchObject({ options: [{ optionId: 'fried' }, { optionId: 'scrambled' }, { optionId: 'sausage' }] })

    const bad = await runTool('bestSellingOptions', { limit: 'lots' })
    expect(bad).toMatchObject({ options: [{ optionId: 'fried' }] })
  })

  it('ordersOnDate uses the shop time zone from the menu', async () => {
    const result = await runTool('ordersOnDate', { date: '2026-11-20' })
    expect(result).toMatchObject({ ok: true, timeZone: menu.shop.timeZone, orderIds: ['ORD-1001', 'ORD-1002'] })
  })

  it('ordersOnDate without a date returns an error the model can explain', async () => {
    const result = await runTool('ordersOnDate', {})
    expect(result).toMatchObject({ ok: false })
  })

  it('an unknown tool name returns an error instead of crashing', async () => {
    const result = await runTool('customerRanking', {})
    expect(result).toEqual({ error: 'Unknown tool "customerRanking".' })
  })
})
