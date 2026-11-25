import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import App from '../../App'
import { menu } from '../../fixtures'
import { configA, configB, configByNames } from '../builders'

const TTL_MS = menu.shop.reservationTtlSeconds * 1000
const SCRAMBLED = Object.keys(configByNames({ Scrambled: 1 }))[0]

function button(name: string): HTMLElement {
  return screen.getByRole('button', { name })
}

// Opens cart item 1 in the builder (edit mode).
async function openEditOfFirstItem(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const item = await screen.findByRole('listitem', { name: 'Cart item 1' })
  await user.click(within(item).getByRole('button', { name: 'Edit' }))
  await screen.findByRole('button', { name: 'Save changes' })
  await screen.findAllByText(/left$/) // stock loaded
}

// The whole App with many clicks: ~2 s alone, slower when all test files run in parallel.
describe('D1 / D3 edit behaviour in the UI', { timeout: 15_000 }, () => {
  it('D1: another tab takes the eggs → Save shows the shortage, config kept; fix it → Save works', async () => {
    // Tab A: item A holds 2 eggs.
    await api.addItem({ idempotencyKey: 'd1-a', config: configA(), quantity: 1 })
    const user = userEvent.setup()
    render(<App />)
    await openEditOfFirstItem(user)

    // Edit: 4 Scrambled (2 more eggs than the item holds — there is stock for that right now).
    await user.click(button('Add one Scrambled'))
    await user.click(button('Add one Scrambled'))
    expect(screen.getByLabelText('Scrambled quantity')).toHaveTextContent('4')

    // Tab B (same localStorage) takes the other 8 eggs before tab A saves.
    await api.addItem({ idempotencyKey: 'd1-b1', config: configB(), quantity: 1 })
    await api.addItem({
      idempotencyKey: 'd1-b2',
      config: configByNames({ Toast: 1, Fried: 2, 'Chicken Sausage': 1 }),
      quantity: 1,
    })

    await user.click(button('Save changes'))
    expect(await screen.findByText('Short: 2 egg')).toBeInTheDocument()
    // The edit is still on screen, nothing saved.
    expect(screen.getByLabelText('Scrambled quantity')).toHaveTextContent('4')
    expect((await api.getCart()).cart.items[0].config[SCRAMBLED]).toBe(2)

    // The user changes the selection and saves again.
    await user.click(button('Remove one Scrambled'))
    await user.click(button('Remove one Scrambled'))
    await waitFor(() => expect(button('Save changes')).toBeEnabled())
    await user.click(button('Save changes'))

    // Edit mode ends; the server has the new version.
    expect(await screen.findByRole('button', { name: 'Add to cart' })).toBeInTheDocument()
    const saved = (await api.getCart()).cart.items[0]
    expect(saved.version).toBe(2)
    expect(saved.config[SCRAMBLED]).toBe(2)
  })

  describe('D3: reservation expires during an edit', () => {
    const browserStart = Date.parse('2026-11-25T04:00:00.000Z')

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(browserStart)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('D3: Save disabled with a message, config kept, "Add as new item" adds a new item', async () => {
      await api.addItem({ idempotencyKey: 'd3-a', config: configA(), quantity: 1 })
      const user = userEvent.setup()
      render(<App />)
      await openEditOfFirstItem(user)

      // 4 Scrambled (eggs go in steps of 2).
      await user.click(button('Add one Scrambled'))
      await user.click(button('Add one Scrambled'))
      expect(screen.getByLabelText('Scrambled quantity')).toHaveTextContent('4')

      vi.setSystemTime(browserStart + TTL_MS) // server time is now at expiresAt
      expect(
        await screen.findByText('Reservation expired. Stock was released.', {}, { timeout: 2000 }),
      ).toBeInTheDocument()
      expect(button('Save changes')).toBeDisabled()
      expect(screen.getByLabelText('Scrambled quantity')).toHaveTextContent('4')

      // The old item in the cart: Expired, Remove only.
      const oldItem = screen.getByRole('listitem', { name: 'Cart item 1' })
      await within(oldItem).findByText(/Reservation expired — remove or add again/)
      expect(within(oldItem).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()

      await user.click(button('Add as new item'))
      expect(await screen.findByRole('button', { name: 'Add to cart' })).toBeInTheDocument()

      const { cart } = await api.getCart()
      expect(cart.items).toHaveLength(2)
      expect(cart.items.map((item) => item.status)).toEqual(['expired', 'active'])
      expect(cart.items[1].config[SCRAMBLED]).toBe(4)
    })
  })
})
