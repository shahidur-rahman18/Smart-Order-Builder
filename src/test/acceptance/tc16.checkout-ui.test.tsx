import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import App from '../../App'
import { bdtShort, discountLabel } from '../../components/cart/discountText'
import { formatBdt } from '../../engine/money'
import { priceCart } from '../../engine/pricing'
import { menu } from '../../fixtures'
import { server } from '../../mock/node'
import { configA, configB } from '../builders'

const SKEW_MS = 90_000

function couponCode(): string {
  const coupon = menu.promotions.find((promo) => promo.type === 'couponPercent')
  if (!coupon || coupon.type !== 'couponPercent') throw new Error('fixture has no coupon')
  return coupon.code
}

function totals(): HTMLElement {
  return screen.getByRole('region', { name: 'Totals' })
}

// The whole App with many clicks: ~2 s alone, slower when all test files run in parallel.
describe('Checkout UI', { timeout: 15_000 }, () => {
  // Browser 10:00:00 Dhaka → server 10:01:30 Dhaka (before the coupon's end time).
  const browserStart = Date.parse('2026-11-25T04:00:00.000Z')

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(browserStart)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the full breakdown; a coupon typed in lower case is applied by the server', async () => {
    const a = (await api.addItem({ idempotencyKey: 'co-a', config: configA(), quantity: 1 })).item
    const b = (await api.addItem({ idempotencyKey: 'co-b', config: configB(), quantity: 1 })).item
    const user = userEvent.setup()
    render(<App />)

    const lines = [a, b].map(({ id, config, quantity }) => ({ id, config, quantity }))
    const now = browserStart + SKEW_MS
    const without = priceCart(lines, menu, menu.promotions, now, null)
    await waitFor(() =>
      expect(within(totals()).getByLabelText('Subtotal')).toHaveTextContent(`BDT ${formatBdt(without.subtotal)}`),
    )
    expect(within(totals()).getByLabelText('VAT')).toHaveTextContent(`BDT ${formatBdt(without.vat)}`)
    expect(within(totals()).getByLabelText('Payable')).toHaveTextContent(`BDT ${bdtShort(without.payable)}`)

    await user.type(screen.getByLabelText('Coupon code'), couponCode().toLowerCase())
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    const withCoupon = priceCart(lines, menu, menu.promotions, now, couponCode().toLowerCase())
    expect(withCoupon.coupon.applied).toBe(true)
    await waitFor(() =>
      expect(within(totals()).getByLabelText('Payable')).toHaveTextContent(`BDT ${bdtShort(withCoupon.payable)}`),
    )
    // The applied coupon line is named from the promotion data, with the engine's reason on hover.
    const couponLine = withCoupon.candidates.find((c) => c.id === withCoupon.appliedDiscount?.id)
    if (!couponLine) throw new Error('no applied discount')
    const label = within(totals()).getByText(discountLabel(couponLine, menu))
    expect(label).toHaveAttribute('title', couponLine.reason)
    expect(screen.getByText(/^Applied · valid before/)).toBeInTheDocument()
  })

  it('TC-16 (UI): double click on Pay → one POST, one order, cart empties', async () => {
    let posts = 0
    server.use(
      http.post('/api/checkout', () => {
        posts += 1
      }),
    )
    await api.addItem({ idempotencyKey: 'co-tc16', config: configB(), quantity: 1 })
    const before = (await api.getOrders()).orders.length
    const user = userEvent.setup()
    render(<App />)

    const pay = await screen.findByRole('button', { name: /^Pay/ })
    await waitFor(() => expect(pay).toBeEnabled())
    await user.dblClick(pay)

    expect(await screen.findByText(/Order placed/)).toBeInTheDocument()
    expect(posts).toBe(1)
    expect((await api.getOrders()).orders).toHaveLength(before + 1)
    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument()
  })

  it('Pay is disabled with a reason while the cart has nothing active', async () => {
    render(<App />)
    const pay = await screen.findByRole('button', { name: /^Pay/ })
    // First "Loading cart…", then the real reason.
    await waitFor(() => expect(pay).toHaveAttribute('title', 'Nothing active in the cart to pay for.'))
    expect(pay).toBeDisabled()
  })
})
