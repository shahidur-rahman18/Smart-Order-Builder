import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { CartPanel } from '../../components/cart/CartPanel'
import { menu } from '../../fixtures'
import { useCart } from '../../hooks/useCart'
import { configA, configB } from '../builders'

const TTL_MS = menu.shop.reservationTtlSeconds * 1000

// The panel gets its cart from the hook, the same way App.tsx wires it.
function CartHarness() {
  const cart = useCart()
  return <CartPanel menu={menu} cart={cart} editingId={null} onEdit={() => {}} />
}

function minutesText(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${Math.floor(totalSeconds / 60)}:${seconds}`
}

describe('Cart UI', () => {
  it('lists cart items and Remove takes one out', async () => {
    await api.addItem({ idempotencyKey: 'ui-a', config: configA(), quantity: 1 })
    await api.addItem({ idempotencyKey: 'ui-b', config: configB(), quantity: 1 })
    const user = userEvent.setup()
    render(<CartHarness />)

    const items = await screen.findAllByRole('listitem', { name: /^Cart item/ })
    expect(items).toHaveLength(2)

    await user.click(within(items[0]).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(screen.getAllByRole('listitem', { name: /^Cart item/ })).toHaveLength(1))
    expect((await api.getCart()).cart.items).toHaveLength(1)
  })

  describe('TC-15 (UI): countdown follows server time (+90 s), not the browser clock', () => {
    const browserStart = Date.parse('2026-11-25T04:00:00.000Z')

    beforeEach(() => {
      // Only Date is fake: the browser clock stands still until we move it.
      // Real timers keep running, so the 1 s countdown tick still happens.
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(browserStart)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('TC-15 shows 5:00 (not 6:30), counts down, then shows Expired with Remove only', async () => {
      await api.addItem({ idempotencyKey: 'ui-tc15', config: configB(), quantity: 1 })
      render(<CartHarness />)

      // By the browser's own clock 390 s would seem left; server time says 300 s.
      expect(await screen.findByText(minutesText(TTL_MS))).toBeInTheDocument()
      expect(screen.queryByText(minutesText(TTL_MS + 90_000))).not.toBeInTheDocument()

      vi.setSystemTime(browserStart + 120_000)
      expect(await screen.findByText(minutesText(TTL_MS - 120_000), {}, { timeout: 2000 })).toBeInTheDocument()

      vi.setSystemTime(browserStart + TTL_MS)
      expect(await screen.findByText(/Reservation expired/, {}, { timeout: 2000 })).toBeInTheDocument()
      const item = screen.getByRole('listitem', { name: /^Cart item/ })
      expect(within(item).getByRole('button', { name: 'Remove' })).toBeEnabled()
      expect(within(item).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    })
  })
})
